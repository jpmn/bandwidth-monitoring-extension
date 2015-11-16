'use strict';

angular.module('ebbe.filters', [])

.filter('i18n', [function() {
    return function(input, params) {
        input = input || '';
        return chrome.i18n.getMessage(input, params || []);
    }
}])

.filter('boolean', [function() {
    return function(input, truthy, falsy) {
        input = input || false;
        return input ? truthy : falsy;
    }
}])

.filter('nl2br', ['$sce', function ($sce) {
    return function (input) {
        return input ? $sce.trustAsHtml(input.replace(/\n/g, '<br/>')) : '';
    }
}])

.filter('min', [function () {
    return function (input, value) {
        return Math.min(input, value);
    }
}])

.filter('max', [function () {
    return function (input, value) {
        return Math.max(input, value);
    }
}])

.filter("capitalize", [function() {
    return function(input, all) {
        return (!!input) ? input.replace(/([^\W_]+[^\s-]*) */g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) : '';
    }
}])

.filter("sanitize", ['$sce', function($sce) {
    return function(input){
        return $sce.trustAsHtml(input);
    }
}]);