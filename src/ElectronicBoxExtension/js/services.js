'use strict';

angular.module('ebbe.services', [])

.factory('UserService', ['$q', function($q) {
    return {
        get_options: function() {
            var d = $q.defer();
            chrome.storage.local.get('options', function(items) {
                d.resolve(items.options);
            });
            return d.promise;
        },
        set_options: function(options) {
            var d = $q.defer();
            chrome.storage.local.set({'options': options}, function() {
                d.resolve({status: "OK"});
            });
            return d.promise;
        }
    }
}]);