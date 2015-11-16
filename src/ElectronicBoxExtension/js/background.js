'use strict';

var globals = {};
var defaults = {};
var options = {};

var animation_id = undefined;

function initialize(callback) {

    http_request_get('js/globals.json', function(response) {
        globals = JSON.parse(response);
        //console.log('Initialize globals...');
    });

    http_request_get('js/defaults.json', function(response) {
        defaults = JSON.parse(response);
        //console.log('Initialize defaults...');
    });

    sync_local_settings(function() {
        options.profile.locale = chrome.i18n.getMessage('@@ui_locale').split("_")[0];

        if (options.verifications.startup.enabled) {
            update_bandwidth(function(opts) {
                if (options.notifications.rules === 'all') {
                    send_all_notification(true);
                } else if (options.notifications.rules === 'presets') {
                    send_presets_notification(true);
                }
            });
        }
        if (options.verifications.periodic.enabled) {
            set_periodic_verification();
        }

        callback();
    });
}

function dispose() {
    var alarm_id = globals.verifications.alarm_id;

    chrome.alarms.clear(alarm_id, function(cleared) {
        //console.log('Dispose periodic alarms...');
    });

    var notification_id = globals.notifications.notification_id;

    chrome.notifications.clear(notification_id, function(cleared) {
        //console.log('Dispose desktop notifications...');
    });
}

function animate_badge_loading_start() {
    //console.log('Badge animation start...');

    chrome.browserAction.setBadgeText({
        text: ' '
    });

    chrome.browserAction.setBadgeBackgroundColor({
        color: [0, 0, 0, 1]
    });

    var i = 0;
    var j = -1;
    var step = 20;

    if (animation_id) {
        clearInterval(animation_id);
        animation_id = undefined;
    }

    animation_id = setInterval(function() {
        var color = 125 + (step * (j > 0 ? (i % 4) : 4 - (i % 4)));
        chrome.browserAction.setBadgeBackgroundColor({
            color: [color, color, color, 150]
        });
        j = j * (++i % 4 === 0 ? -1 : 1);
    }, 100);
}

function animate_badge_loading_end(timer, callback) {
    //console.log('Badge animation end...');
    setTimeout(function() {
        clearInterval(animation_id);
        animation_id = undefined;
        chrome.browserAction.setBadgeText({
            text: ''
        });
        if (callback) callback();
    }, timer || 1);
}

function sync_local_settings(callback) {
    chrome.storage.local.get('options', function(items) {
        options = $.extend(true, defaults, items.options, {
            verifications: {
                count: 0
            }
        });
        if (items.options) {
            chrome.storage.local.set({'options': options}, function() {
                console.log('Local settings synched...', options);
                callback();
            });
        } else {
            chrome.storage.local.set({'options': options}, function() {
                console.log('Remote settings synched...', options);
                callback();
            });
        }
    });
}

function sync_remote_settings(callback) {
    chrome.storage.local.get('options', function(items) {
        options = $.extend(true, defaults, items.options, {
            verifications: {
                count: 0
            }
        });
        chrome.storage.local.set({'options': items.options}, function() {
            //console.log('Remote settings synched...', options);
            callback();
        });
    });
}

function parse_detail_plan(value) {
    return value.match(/^.*:\s?(.*)\s?$/)[1];
}

function parse_detail_extra(value) {
    return parseInt(value.match(/^.*:\s?(\d+)\sX\s(?:\d+)\sGB\s?$/)[1], 10);
}

function parse_detail_block(value) {
    return parseFloat(value.match(/^.*:\s?(?:\d+)\sX\s(\d+)\sGB\s?$/)[1]);
}

function parse_detail_total(value) {
    return parseFloat(value.match(/^.*:\s?(\d+)\sG\s?$/)[1]);
}

function parse_detail_available(value) {
    return parseFloat(value.match(/^.*:\s?(-?\d+(?:\.\d+)?)\sG\s?$/)[1]);
}

function parse_detail_peak(value) {
    return value.match(/^.*:\s?(NON?)\s?$/).length === 0;
}

function set_detail_consumed(details) {
    return details.total - details.available;
}

function set_detail_normal_usage(details) {
    var days_in_month = moment().daysInMonth();
    var today = moment().date();

    return details.total / days_in_month * today;
}

function set_detail_current_usage(details) {
    var days_in_month = moment().daysInMonth();
    var today = moment().date();

    return details.consumed / today * days_in_month;
}

function set_detail_normal_daily_usage(details) {
    var days_in_month = moment().daysInMonth();
    var today = moment().date();

    return details.total / days_in_month;
}

function set_detail_current_daily_usage(details) {
    var today = moment().date();

    return details.consumed / today;
}

function set_detail_remaining_daily_usage(details) {
    var days_in_month = moment().daysInMonth();
    var today = moment().date();

    return details.available / (days_in_month - today);
}

function set_detail_percent(details) {
    return parseInt(Math.min(100, Math.max(0, details.consumed / details.total * 100)), 10);
}

function set_detail_percent_normal_usage(details) {
    return parseInt(Math.min(100, Math.max(0, details.normal_usage / details.total * 100)), 10);
}

function set_detail_percent_current_usage(details) {
    return parseInt(Math.max(0, details.current_usage / details.total * 100), 10);
}

function set_detail_number_of_days(details) {
    var days = moment().daysInMonth();
    var today = moment().date();

    return days - today + 1;
}

function http_request_get(url, callback, sync) {
    var xhr = new XMLHttpRequest;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200 || xhr.status == 0) {
                callback(xhr.responseText);
            } else {
                if (error) error(xhr.statusText);
            }
        }
    }

    xhr.open('GET', url, !(sync || false));
    xhr.send(null);
}

function http_request_post(url, params, callback, error) {
    var xhr = new XMLHttpRequest;

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.status == 200 || xhr.status == 0) {
                callback(xhr.responseText);
            } else {
                if (error) error(xhr.statusText);
            }
        }
    };

    console.log(url, JSON.stringify(params));
    xhr.open('POST', url, true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send(params);
}

function update_bandwidth(callback) {
    //console.log('Execute verification...');

    animate_badge_loading_start();

    if (moment().diff(options.bandwidth.details.timestamp, 'days') > 0) {
        _.forEach(options.notifications.presets, function(preset) {
            preset.dismiss = false;
        });
    }

    var now = moment();
    now.subtract(now.minute(), 'minutes');
    var last = moment(options.bandwidth.details.timestamp);
    last.subtract(last.minute(), 'minutes');

    if (now.diff(last, 'hours') > 0) {
        options.verifications.count = 0;
    }

    if (!options.profile.vlcode) {
        options.bandwidth.status = 'error';
        animate_badge_loading_end(1, function() {
            callback(options);
        });
        return;
    }

    if (options.verifications.count >= globals.verifications.limit) {
        options.bandwidth.status = 'limit';
        animate_badge_loading_end(1, function() {
            callback(options);
        });
        return;
    }

    var url = globals.verifications.url;

    var params = {
      actions: 'list',
      DELETE_lng: options.profile.locale,
      lng: options.profile.locale,
      code: options.profile.vlcode
    }

    var url_params = Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k])
    }).join('&');

    console.log(url, params, url_params);

    http_request_post(url, url_params, function(response) {
        var is_page_limit = parse_page_limit(response);
        var is_page_error = parse_page_error(response);
        var is_page_maintenance = parse_page_maintenance(response);

        if (is_page_limit) {
            options.bandwidth.status = 'limit';
            options.verifications.count = globals.verifications.limit;
        } else if (is_page_error) {
            options.bandwidth.status = 'error';
        } else if (is_page_maintenance) {
            options.bandwidth.status = 'maintenance';
        } else {
            options.bandwidth.status = 'normal';
            options = parse_page_details(response, callback);
        }

        chrome.storage.local.set({ 'options': options }, function() {
            animate_badge_loading_end(2000, function() {

                if (options.bandwidth.status === 'normal') {
                    if (options.bandwidth.details.level === 'low') {
                        chrome.browserAction.setBadgeText({
                            text: ' '
                        });
                        chrome.browserAction.setBadgeBackgroundColor({
                            color: [92, 184, 92, 150]
                        });
                    } else if (options.bandwidth.details.level === 'medium') {
                        chrome.browserAction.setBadgeText({
                            text: ' '
                        });
                        chrome.browserAction.setBadgeBackgroundColor({
                            color: [240, 173, 78, 150]
                        });
                    } else if (options.bandwidth.details.level === 'high' || options.bandwidth.details.level === 'over') {
                        chrome.browserAction.setBadgeText({
                            text: ' '
                        });
                        chrome.browserAction.setBadgeBackgroundColor({
                            color: [217, 83, 79, 150]
                        });
                    }
                }

                callback(options);
            });
        });
    }, function(status) {
        animate_badge_loading_end(1, function() {
            callback(options);
        });
    });
}

function parse_page_limit(response) {
    var page_fr = response.indexOf('Vous avez atteint la limite d\'affichage possible <b>par heure</b>.');
    var page_en = response.indexOf('You have reach the maximum of request you can do <b>per hour</b>.');
    return page_fr >= 0 || page_en >= 0;
}

function parse_page_error(response) {
    var page_fr = response.indexOf('<td width="90%" valign="top">ERREUR</td>');
    var page_en = response.indexOf('<td width="90%" valign="top">ERROR</td>');
    return page_fr >= 0 || page_en >= 0;
}

function parse_page_maintenance(response) {
    var page_fr = response.toLowerCase().indexOf('maintenance');
    var page_en = response.toLowerCase().indexOf('maintenance');
    return page_fr >= 0 || page_en >= 0;
}

function parse_page_details(response, callback) {
    var $container = $(response);
    var $details = $container.find('div:lt(5)');

    var content = $details.map(function(i, elem) {
        return $(elem).text();
    }).get();

    var details = {
        plan: parse_detail_plan(content[0]),
        extra: parse_detail_extra(content[1]),
        block: parse_detail_block(content[1]),
        total: parse_detail_total(content[2]),
        available: parse_detail_available(content[3]),
        peak: parse_detail_peak(content[4])
    };

    details.consumed = set_detail_consumed(details);
    details.normal_usage = set_detail_normal_usage(details);
    details.current_usage = set_detail_current_usage(details);
    details.normal_daily_usage = set_detail_normal_daily_usage(details);
    details.current_daily_usage = set_detail_current_daily_usage(details);
    details.remaining_daily_usage = set_detail_remaining_daily_usage(details);
    details.percent = set_detail_percent(details);
    details.percent_normal_usage = set_detail_percent_normal_usage(details);
    details.percent_current_usage = set_detail_percent_current_usage(details);
    details.number_of_days = set_detail_number_of_days(details);
    details.timestamp = moment().valueOf();

    if (details.available <= 0) {
        details.level = 'over';
    } else if (details.remaining_daily_usage <= details.normal_daily_usage * 0.25) {
        details.level = 'high';
    } else if (details.remaining_daily_usage > details.normal_daily_usage * 0.25 && details.remaining_daily_usage <= details.normal_daily_usage * 0.75) {
        details.level = 'medium';
    } else if (details.consumed >= details.normal_usage) {
        details.level = 'low';
    } else {
        details.level = 'under';
    }

    options = $.extend(true, options, {
        bandwidth: {
            details: details
        },
        verifications: {
            count: options.verifications.count + 1
        }
    });

    return options;
}

function set_periodic_verification() {
    //console.log("Set periodic verification", options);
    var params = {
        periodInMinutes: options.verifications.periodic.period
    };

    var alarm_id = globals.verifications.alarm_id;

    chrome.alarms.clear(alarm_id, function() {
        chrome.alarms.create(alarm_id, params);
    });
}

function send_notifications(message, skip_email) {
    if (options.notifications.desktop.enabled) {
        send_desktop_notification(message);
    }
    if (!skip_email && options.notifications.email.enabled) {
        send_email_notification(message);
    }
}

function send_all_notification(skip_email) {
    send_notifications('notifications_desktop_all_message', skip_email);
}

function send_presets_notification(skip_email) {
    var sorted_presets = _.sortBy(globals.notifications.rules.presets, 'value');

    _.forEach(sorted_presets, function(definition) {
        options.notifications.presets[definition.key].dismiss = options.bandwidth.details.percent / 100 >= definition.value;
    });

    var last_preset = _.findLast(sorted_presets, function(definition) {
        var preset = options.notifications.presets[definition.key];
        //console.log(definition.key, preset.enabled && preset.dismiss);
        return preset.enabled && preset.dismiss;
    });

    send_notifications(globals.notifications.rules.prefix + '_' + last_preset.key, skip_email);
}

function send_desktop_notification(message) {
    //console.log("Send desktop notification");

    var desktop = globals.notifications.desktop;

    var params = $.extend(true, {}, desktop, {
        title: chrome.i18n.getMessage(desktop.title),
        message: chrome.i18n.getMessage(message) + '...',
        contextMessage: chrome.i18n.getMessage(desktop.contextMessage),
        progress: options.bandwidth.details.percent
    });

    var notification_id = globals.notifications.notification_id;

    chrome.notifications.clear(notification_id, function(cleared) {
        chrome.notifications.create(notification_id, params, function(notification_id) {
            //console.log('Create desktop notification', notification_id);
        });
    });
}

function send_email_notification(message) {
    var mandrill = options.profile.mandrill;

    var url = globals.verifications.url.replace('$0', options.profile.locale).replace('$1', options.profile.vlcode);

    var params = {
        key: mandrill.key,
        message: {
            from_email: mandrill.from_email,
            to: [
                {email: mandrill.from_email, name:'Me', type: 'to'},
            ],
            autotext: true,
            subject: chrome.i18n.getMessage('extension_name'),
            html: '<h1>'+chrome.i18n.getMessage('notifications_email_title')+'</h1>'+
                '<p>'+chrome.i18n.getMessage('notifications_email_content')+'</p>'+
                '<p>'+chrome.i18n.getMessage(message)+'</p>'+
                '<a href="'+url+'">'+
                    'ElectronicBox'+
                '</a>'
        }
    };

    $.post(mandrill.url, params, function(response) {
        //console.log('Email notification sent!', response);
    });
}

chrome.runtime.onInstalled.addListener(function() {
    //console.log('Extension was installed...');

    initialize(function() {
        if (options.profile.show_on_update) {
            chrome.tabs.create({url: "options.html"});
        }
    });
});

chrome.runtime.onStartup.addListener(function() {
    //console.log('Extension was started...');

    initialize(function() {

    });
});

chrome.runtime.onRestartRequired.addListener(function() {
    //console.log('Restart required...');

    sync_remote_settings(function() {
        dispose();
    });
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    //console.log('Extension sent an alarm...');

    if (alarm.name === globals.verifications.alarm_id) {
        update_bandwidth(function(opts) {
            if (options.notifications.rules === 'all') {
                send_all_notification();
            } else if (options.notifications.rules === 'presets') {
                send_presets_notification();
            }
        });
    }
});

chrome.storage.onChanged.addListener(function(items, area) {
    //console.log('Storage changed...', area);

    if (area === 'local') {
        options = items.options.newValue;

        dispose();

        //console.log(area, options.verifications.count, globals.verifications.limit, options.verifications.count < globals.verifications.limit);

        /*if (options.verifications.count < globals.verifications.limit) {
            update_bandwidth(function(opts) {
                mode = 'normal';
                //console.log("Updated bandwidth details...", options);
            });
        }*/

        if (options.verifications.periodic.enabled) {
            set_periodic_verification();
        }
    }
});
