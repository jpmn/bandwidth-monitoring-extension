'use strict';

angular.module('ebbe', ['ebbe.filters', 'ebbe.services', 'ngRoute', 'ui.bootstrap'])

.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
    $routeProvider
        // route for the details page
        .when('/details', {
            templateUrl : 'views/details.html',
            controller  : 'DetailsCtrl'
        })
        // route for anything else
        .otherwise({
            redirectTo: '/details'
        });

    //$locationProvider.html5Mode(true).hashPrefix('!');
}])

.controller('ApplicationCtrl', ['$scope', '$rootScope', '$location', function($scope, $rootScope, $location) {

    $scope.is_active = function(view) {
        return view === $location.path();
    }

}])

.controller('DetailsCtrl', ['$scope', '$rootScope', 'UserService', function($scope, $rootScope, UserService) {

    $scope.options = {};
    $scope.globals = {};

    $scope.$watch('options', function(newval, oldval) {
        if (!angular.equals({}, newval)) {
            moment.locale($scope.options.profile.locale);
            $scope.number_of_days = moment().daysInMonth() - moment().date() + 1;
            $scope.current_month = moment().month(moment().month()).format('MMMM');

            var now = moment();
            now.subtract(now.minute(), 'minutes');
            var last = moment($scope.options.bandwidth.details.timestamp);
            last.subtract(last.minute(), 'minutes');

            $rootScope.verification_count = $scope.options.verifications.count;
            if (now.diff(last, 'hours') > 0) {
                $rootScope.verification_count = 0;
            }
        }
    }, true);

    $rootScope.update = function() {
        chrome.runtime.getBackgroundPage(function(page) {
            page.update_bandwidth(function(options) {
                $scope.$apply(function() {
                    $scope.options = angular.copy(options);
                    $rootScope.options = $scope.options;
                });
            });
        });
    }

    UserService.get_options().then(function(options) {
        $scope.options = angular.copy(options);
        $rootScope.options = $scope.options;
    });

    chrome.runtime.getBackgroundPage(function(page) {
        $scope.globals = angular.copy(page.globals);
        $rootScope.globals = $scope.globals;
    });

}]);
