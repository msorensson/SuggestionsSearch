(function($) {
    'use strict';

    var utils = (function() {
        var now = Date.now || function() {
            return new Date().getTime();
        };

        function debounce(func, wait, immediate) {
            var timeout, args, context, timestamp, result;

            var later = function() {
                var last = now() - timestamp;

                if (last < wait && last >= 0) {
                    timeout = setTimeout(later, wait - last);
                } else {
                    timeout = null;
                    if (!immediate) {
                        result = func.apply(context, args);
                        if (!timeout) {
                            context = args = null;
                        }
                    }
                }
            };

            return function() {
                context = this;
                args = arguments;
                timestamp = now();
                var callNow = immediate && !timeout;
                if (!timeout) timeout = setTimeout(later, wait);
                if (callNow) {
                    result = func.apply(context, args);
                    context = args = null;
                }

                return result;
            };
        };

        return {
            debounce: debounce
        };
    })();

    var functionKeys = [
        38, // Up
        40 // Down
    ];

    function SuggestionsSearch(el, opts) {
        var self  = this;

        self.$el    = $(el);
        self.opts   = opts;
        self.xhr    = null;

        self.keyIdx = -1;
        self.searchTermSuggestionsCount = 0;

        if (self.$el.data('endpoint')) {
            self.opts.endpoint = self.$el.data('endpoint');
        }

        self.initialize();

        self.$el
            .on('keydown', function(e) {
                if (functionKeys.indexOf(e.keyCode) !== -1) {
                    self.functionKeyup(e.keyCode);
                    e.preventDefault();
                }
            })
            .on('keyup', utils.debounce(function(e) {
                var keyCode = e.keyCode;

                // Test if a function key was pressed,
                // in which case we maybe should performed another action.
                if (functionKeys.indexOf(keyCode) === -1) {
                    self.keyup(e);
                }
            }, self.opts.debounceRate));
    }

    SuggestionsSearch.prototype = {

        postForm: function() {
            var self = this;
            var $form = self.$el.parents('form');
            $form.submit();
        },

        empty: function() {
            var self = this;
            self.reset();
            self.$el.next().html('');
        },

        reset: function() {
            var self = this;
            self.keyIdx = -1;
            self.searchTermSuggestionsCount = 0;
        },

        format: function(data) {
            var self = this;

            if (self.opts.format) {
                return self.opts.format(data);
            }

            return '';
        },

        insertSuggestions: function(data) {
            var self = this;
            var $suggestionsWrapper = self.$el.next();
            self.empty();
            self.searchTermSuggestionsCount = data.suggestions.length;
            $suggestionsWrapper.html(self.format(data));
            self.$el.next();
        },

        performSearch: function(str) {
            var self = this;

            // Abort any previous xhr request.
            if (self.xhr !== null) {
                self.xhr.abort();
            }

            self.xhr = $.ajax({
                url: self.opts.endpoint,
                data: {
                    q: str
                },
                success: function(data) {
                    self.insertSuggestions(data);
                },
                complete: function() {
                    self.xhr = null;
                }
            });
        },

        keyup: function(e) {
            var self = this;
            var str  = $(e.currentTarget).val();

            if (str.length > self.opts.minStringLength) {
                self.performSearch(str);
            } else {
                self.empty();
            }
        },

        functionKeyup: function(keyCode) {
            var self = this;
            var $searchTermSuggestions = $('.searchterm-suggestions', self.$suggestionsWrapper);
            var $suggestions = $('a', $searchTermSuggestions);

            switch(keyCode) {
            case 38: // Up
                self.keyIdx--;
                if (self.keyIdx < 0) {
                    self.keyIdx = self.searchTermSuggestionsCount - 1;
                    self.keyIdx = self.searchTermSuggestionsCount - 1;
                }
                break;
            case 40: // Down
                self.keyIdx++;
                if (self.keyIdx >= self.searchTermSuggestionsCount) {
                    self.keyIdx = 0;
                }
                break;
            }

            $suggestions
                .removeClass('active')
                .eq(self.keyIdx)
                .addClass('active');

            self.$el.val($suggestions.eq(self.keyIdx).data('keyword'));
        },

        selectSuggestion: function(e) {
            var self = this;
            var str = $(e.currentTarget).data('keyword');
            self.$el.val(str);
            self.postForm();
        },

        initialize: function() {
            var self = this;
            self.$suggestionsWrapper = $('<div class="suggestions" />');

            self.$suggestionsWrapper.on('click', '.searchterm-suggestions a', function(e) {
                self.selectSuggestion(e);
                e.preventDefault();
            });

            self.$el.after(self.$suggestionsWrapper);
        }
    };

    $.fn.suggestionsSearch = function(options) {
        var opts = $.extend({}, $.fn.suggestionsSearch.defaults, options);

        return this.each(function() {
            var suggestionsSearch = new SuggestionsSearch(this, opts);
        });
    };

    $.fn.suggestionsSearch.defaults = {
        minStringLength: 2,
        debounceRate: 200
    };

})(jQuery);

$('.suggestions-search').suggestionsSearch({
    format: function(data) {
        var output = '';
        output += '<div class="searchterm-suggestions">';

        for (var i = 0; i<data.suggestions.length; i++) {
            output += '<a href="#" data-keyword="' + data.suggestions[i].raw + '">' + data.suggestions[i].formatted+ '</a>';
        }

        output += '</div>';

        return output;
    }
});
