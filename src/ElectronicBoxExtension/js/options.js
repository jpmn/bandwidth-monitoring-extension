'use strict';

angular.module('ebbe', ['ebbe.filters', 'ebbe.services', 'ngRoute', 'ui.bootstrap'])

.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
    $routeProvider
        // route for the settings page
        .when('/settings', {
            templateUrl : 'views/settings.html',
            controller  : 'SettingsCtrl'
        })
        // route for the about page
        .when('/stats', {
            templateUrl : 'views/stats.html',
            controller  : 'StatsCtrl'
        })
        // route for the support page
        .when('/support', {
            templateUrl : 'views/support.html',
            controller  : 'SupportCtrl'
        })
        // route for the about page
        .when('/about', {
            templateUrl : 'views/about.html',
            controller  : 'AboutCtrl'
        })
        // route for anything else
        .otherwise({
            redirectTo: '/settings'
        });

    //$locationProvider.html5Mode(true).hashPrefix('!');
}])

.controller('ApplicationCtrl', ['$scope', '$location', function($scope, $location) {

    $scope.is_active = function(view) {
        return view === $location.path();
    }

}])

.controller('SettingsCtrl', ['$scope', 'UserService', function($scope, UserService) {

    $scope.options = {};
    $scope.globals = {};

    $scope.save = function(options) {
        $scope.alert_success = false;
        $scope.alert_error = false;
        UserService.set_options(options).then(function() {
            $scope.alert_success = true;
            $scope.form_options.$setPristine();
        }, function() {
            $scope.alert_error = true;
        });
    }

    $scope.cancel = function() {
        $scope.alert_success = false;
        $scope.alert_error = false;
        UserService.get_options().then(function(options) {
            $scope.options = angular.copy(options);
            $scope.form_options.$setPristine();
        });
    }

    chrome.runtime.getBackgroundPage(function(page) {
        $scope.globals = angular.copy(page.globals);
        $scope.cancel();
    });

}])

.controller('StatsCtrl', ['$scope', 'UserService', function($scope, UserService) {

    $scope.options = {};
    $scope.globals = {};

    UserService.get_options().then(function(options) {
        $scope.options = angular.copy(options);
    });

    chrome.runtime.getBackgroundPage(function(page) {
        $scope.globals = angular.copy(page.globals);
    });

}])

.controller('SupportCtrl', ['$scope', function($scope) {

    $scope.bandwidth = {
        details: [
            { title: 'details_plan_label', description: 'details_plan_description' },
            { title: 'details_extra_label', description: 'details_extra_description' },
            { title: 'details_total_label', description: 'details_total_description' },
            { title: 'details_consumed_label', description: 'details_consumed_description' },
            { title: 'details_available_label', description: 'details_available_description' },
            { title: 'details_normal_usage_label', description: 'details_normal_usage_description' },
            { title: 'details_current_usage_label', description: 'details_current_usage_description' },
            { title: 'details_normal_daily_usage_label', description: 'details_normal_daily_usage_description' },
            { title: 'details_current_daily_usage_label', description: 'details_current_daily_usage_description' },
            { title: 'details_remaining_daily_usage_label', description: 'details_remaining_daily_usage_description' }
        ]
    };

}])

.controller('AboutCtrl', ['$scope', function($scope) {

    $scope.changelog = {
        versions: [
            { number: '0.2.13', changes: 'about_changelog_version_0_2_13' },
            { number: '0.2.12', changes: 'about_changelog_version_0_2_12' },
            { number: '0.2.11', changes: 'about_changelog_version_0_2_11' },
            { number: '0.2.10', changes: 'about_changelog_version_0_2_10' },
            { number: '0.2.9', changes: 'about_changelog_version_0_2_9' },
            { number: '0.2.8', changes: 'about_changelog_version_0_2_8' },
            { number: '0.2.7', changes: 'about_changelog_version_0_2_7' },
            { number: '0.2.6', changes: 'about_changelog_version_0_2_6' },
            { number: '0.2.5', changes: 'about_changelog_version_0_2_5' },
            { number: '0.2.4', changes: 'about_changelog_version_0_2_4' },
            { number: '0.2.3', changes: 'about_changelog_version_0_2_3' },
            { number: '0.2.2', changes: 'about_changelog_version_0_2_2' },
            { number: '0.2.1', changes: 'about_changelog_version_0_2_1' },
            { number: '0.2.0', changes: 'about_changelog_version_0_2_0' },
            { number: '0.1.1', changes: 'about_changelog_version_0_1_1' }
        ]
    };

}]);
