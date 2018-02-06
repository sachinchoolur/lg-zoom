(function () {

    'use strict';

    var getUseLeft = function () {
        var useLeft = false;
        var isChrome = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
        if (isChrome && parseInt(isChrome[2], 10) < 54) {
            useLeft = true;
        }

        return useLeft;
    };

    var defaults = {
        scale: 1,
        zoom: true,
        actualSize: true,
        enableZoomAfter: 300,
        useLeftForZoom: getUseLeft()
    };

    var Zoom = function (element) {

        this.core = $(element).data('lightGallery');

        this.core.s = $.extend({}, defaults, this.core.s);

        if (this.core.s.zoom && this.core.doCss()) {
            this.init();

            // Store the zoomable timeout value just to clear it while closing
            this.zoomabletimeout = false;
            this.positionChanged = false;

            // Set the initial value center
            this.pageX = this.core.$outer.width() / 2;
            this.pageY = (this.core.$outer.height() / 2) + $(window).scrollTop();

            this.scale = 1;
        }

        return this;
    };

    Zoom.prototype.buildTemplates = function () {
        var zoomIcons = '<span id="lg-zoom-in" class="lg-icon"></span><span id="lg-zoom-out" class="lg-icon"></span>';

        if (this.core.s.actualSize) {
            zoomIcons += '<span id="lg-actual-size" class="lg-icon"></span>';
        }

        if (this.core.s.useLeftForZoom) {
            this.core.$outer.addClass('lg-use-left-for-zoom');
        } else {
            this.core.$outer.addClass('lg-use-transition-for-zoom');
        }

        this.core.$outer.find('.lg-toolbar').append(zoomIcons);
    }


    Zoom.prototype.enableZoom = function () {

        var _this = this;

        // Add zoomable class
        _this.core.$el.on('onSlideItemLoad.lg.tm.zoom', function (event, index, delay) {

            // delay will be 0 except first time
            var _speed = _this.core.s.enableZoomAfter + delay;

            // set _speed value 0 if gallery opened from direct url and if it is first slide
            if ($('body').hasClass('lg-from-hash') && delay) {

                // will execute only once
                _speed = 0;
            } else {

                // Remove lg-from-hash to enable starting animation.
                $('body').removeClass('lg-from-hash');
            }

            _this.zoomabletimeout = setTimeout(function () {
                _this.core.$slide.eq(index).addClass('lg-zoomable');
            }, _speed + 30);
        });
    }


    /**
     * @desc Image zoom
     * Translate the wrap and scale the image to get better user experience
     *
     * @param {String} scale - Zoom decrement/increment value
     */
    Zoom.prototype.zoomImage = function (scale) {
        var _this = this;
        var $image = _this.core.$outer.find('.lg-current .lg-image');
        var _x;
        var _y;

        // Find offset manually to avoid issue after zoom
        var offsetX = (this.core.$outer.width() - $image.prop('offsetWidth')) / 2;
        var offsetY = ((this.core.$outer.height() - $image.prop('offsetHeight')) / 2) + $(window).scrollTop();

        var originalX;
        var originalY;

        if (scale === 1) {
            _this.positionChanged = false;
        }

        if (_this.positionChanged) {

            originalX = parseFloat($image.parent().attr('data-x'), 10) / (parseFloat($image.attr('data-scale'), 10) - 1);
            originalY = parseFloat($image.parent().attr('data-y'), 10) / (parseFloat($image.attr('data-scale'), 10) - 1);


            _this.pageX = originalX + offsetX;
            _this.pageY = originalY + offsetY;

            _this.positionChanged = false;
        }

        _x = _this.pageX - offsetX;
        _y = _this.pageY - offsetY;


        var x = (scale - 1) * (_x);
        var y = (scale - 1) * (_y);

        this.setZoomStyles({
            x: x,
            y: y,
            scale: scale
        });

    };

    /**
     * @desc apply scale3d to image and translate to image wrap
     * @param {style} X,Y and scale
     */
    Zoom.prototype.setZoomStyles = function (style) {
        var $image = this.core.$outer.find('.lg-current .lg-image');
        var $imageWrap = $image.parent();

        $image
            .css('transform', 'scale3d(' + style.scale + ', ' + style.scale + ', 1)')
            .attr('data-scale', style.scale);

        if (this.core.s.useLeftForZoom) {
            $imageWrap.css({
                left: -style.x + 'px',
                top: -style.y + 'px'
            });
        } else {
            $imageWrap.css('transform', 'translate3d(-' + style.x + 'px, -' + style.y + 'px, 0)');
        }

        $imageWrap.attr('data-x', style.x).attr('data-y', style.y);

    };

    Zoom.prototype.setZoomSwipeStyles = function($el, distance) {
        if (this.core.s.useLeftForZoom) {
            $el.css({
                left: distance.x + 'px',
                top: distance.y + 'px'
            });
        } else {
            $el.css('transform', 'translate3d(' + distance.x + 'px, ' + distance.y + 'px, 0)');
        }
    }

    /**
     * @param index - Index of the current slide
     * @param event - event will be available only if the function is called on clicking/taping the imags
     */
    Zoom.prototype.setActualSize = function (index, event) {
        var _this = this;
        var $image = this.core.$slide.eq(index).find('.lg-image')
        var width = $image.prop('offsetWidth');
        var naturalWidth = this.getNaturalWidth(index) || width;
        var scale = this.getActualSizeScale(naturalWidth, width);
        if (this.core.$outer.hasClass('lg-zoomed')) {
            this.scale = 1;
        } else {
            this.scale = this.getScale(scale);
        }
        this.setPageCords(event);

        this.beginZoom(_this.scale);
        this.zoomImage(_this.scale);

        setTimeout(function () {
            _this.core.$outer.removeClass('lg-grabbing').addClass('lg-grab');
        }, 10);
    }

    Zoom.prototype.getNaturalWidth = function (index) {
        var $image = this.core.$slide.eq(index).find('.lg-image');
        var naturalWidth;
        if (this.core.s.dynamic) {
            naturalWidth = this.core.s.dynamicEl[index].width;
        } else {
            naturalWidth = this.core.$items.eq(index).attr('data-width');
        }
        return naturalWidth || $image[0].naturalWidth;
    };

    Zoom.prototype.getActualSizeScale = function (naturalWidth, width) {
        var _scale;
        var scale;
        if (naturalWidth > width) {
            _scale = naturalWidth / width;
            scale = _scale || 2;
        } else {
            scale = 1;
        }
        return scale;
    };

    Zoom.prototype.getPageCords = function (event) {
        var cords = {};
        if (event) {
            cords.x = event.pageX || event.originalEvent.targetTouches[0].pageX;
            cords.y = event.pageY || event.originalEvent.targetTouches[0].pageY;
        } else {
            cords.x = this.core.$outer.width() / 2;
            cords.y = (this.core.$outer.height() / 2) + $(window).scrollTop();
        }
        return cords;
    };

    Zoom.prototype.setPageCords = function (event) {
        var pageCords = this.getPageCords(event);

        this.pageX = pageCords.x;
        this.pageY = pageCords.y;
    };

    Zoom.prototype.beginZoom = function (scale) {
        this.core.$outer.removeClass('lg-zoom-drag-transition');
        if (scale > 1) {
            this.core.$outer.addClass('lg-zoomed');
        } else {
            this.resetZoom();
        }
    };

    Zoom.prototype.getScale = function (scale) {
        var $image = this.core.$slide.eq(this.core.index).find('.lg-image')
        var width = $image.prop('offsetWidth');
        var naturalWidth = this.getNaturalWidth(this.core.index) || width;
        var actualSizeScale = this.getActualSizeScale(naturalWidth, width);
        if (scale < 1) {
            scale = 1;
        } else if(scale > actualSizeScale) {
            scale = actualSizeScale;
        }
        return scale;
    }

    Zoom.prototype.init = function () {

        var _this = this;
        _this.buildTemplates();
        _this.enableZoom();


        var tapped = false;

        // event triggered after appending slide content
        _this.core.$el.on('onAferAppendSlide.lg.tm.zoom', function (event, index) {

            // Get the current element
            var $image = _this.core.$slide.eq(index).find('.lg-image');

            $image.on('dblclick', function (event) {
                _this.setActualSize(index, event);
            });

            $image.on('touchstart', function (event) {
                if (event.originalEvent.targetTouches.length === 1) {
                    if (!tapped) {
                        tapped = setTimeout(function () {
                            tapped = null;
                        }, 300);
                    } else {
                        clearTimeout(tapped);
                        tapped = null;
                        _this.setActualSize(index, event);
                    }

                    event.preventDefault();
                }
            });

        });

        // Update zoom on resize and orientationchange
        $(window).on('resize.lg.zoom scroll.lg.zoom orientationchange.lg.zoom', function () {
            _this.setPageCords();
            _this.zoomImage(_this.scale);
        });

        $('#lg-zoom-out').on('click.lg', function () {
            if (_this.core.$outer.find('.lg-current .lg-image').length) {
                _this.scale -= _this.core.s.scale;

                _this.scale = _this.getScale(_this.scale);
                _this.beginZoom(_this.scale);
                _this.zoomImage(_this.scale);
            }
        });

        $('#lg-zoom-in').on('click.lg', function () {
            if (_this.core.$outer.find('.lg-current .lg-image').length) {
                _this.scale += _this.core.s.scale;

                _this.scale = _this.getScale(_this.scale);
                _this.beginZoom(_this.scale);
                _this.zoomImage(_this.scale);
            }
        });

        $('#lg-actual-size').on('click.lg', function () {
            _this.setActualSize(_this.core.index);
        });

        // Reset zoom on slide change
        _this.core.$el.on('onBeforeSlide.lg.tm', function () {
            _this.scale = 1;
            _this.resetZoom();
        });

        // Drag option after zoom
        _this.zoomDrag();

        _this.pinchZoom();

        _this.zoomSwipe();

    };

    // Reset zoom effect
    Zoom.prototype.resetZoom = function () {
        this.core.$outer.removeClass('lg-zoomed lg-zoom-drag-transition');
        this.core.$slide.find('.lg-img-wrap').removeAttr('style data-x data-y');
        this.core.$slide.find('.lg-image').removeAttr('style data-scale');

        // Reset pagx pagy values to center
        this.setPageCords();
    };

    Zoom.prototype.getTouchDistance = function(e) {
        return Math.sqrt(
            (e.originalEvent.targetTouches[0].pageX - e.originalEvent.targetTouches[1].pageX) * (e.originalEvent.targetTouches[0].pageX - e.originalEvent.targetTouches[1].pageX) +
            (e.originalEvent.targetTouches[0].pageY - e.originalEvent.targetTouches[1].pageY) * (e.originalEvent.targetTouches[0].pageY - e.originalEvent.targetTouches[1].pageY));
    }

    Zoom.prototype.pinchZoom = function (){
        var startDist = 0;
        var pinchStarted = false;
        var initScale = 1;
        var _this = this;

        _this.core.$slide.on('touchstart.lg', function (e) {

            if (e.originalEvent.targetTouches.length === 2) {
                initScale = _this.scale || 1;
                _this.core.$outer.removeClass('lg-zoom-drag-transition lg-zoom-dragging');

                _this.core.touchAction = 'pinch';

                startDist = _this.getTouchDistance(e);
                    
            }

        });

        _this.core.$slide.on('touchmove.lg', function (e) {
            if (e.originalEvent.targetTouches.length === 2 && _this.core.touchAction === 'pinch') {
                var endDist = _this.getTouchDistance(e);

                var distance = startDist - endDist;
                if(!pinchStarted && Math.abs(distance) > 5) {
                    pinchStarted = true;
                }
                if(pinchStarted) {

                    _this.scale = Math.max(1, initScale + (-distance) * 0.008);
    
                    _this.zoomImage(_this.scale);
                }

            }
        });

        _this.core.$slide.on('touchend.lg', function () {
            if(_this.core.touchAction === 'pinch') {
                pinchStarted = false;
                startDist = 0;
                if(_this.scale <= 1) {
                    _this.resetZoom();
                } else {

                    _this.scale = _this.getScale(_this.scale);
                    _this.zoomImage(_this.scale);

                    _this.core.$outer.addClass('lg-zoomed');
                }
                _this.core.touchAction = '';
            }
        });
    }

    Zoom.prototype.zoomSwipe = function () {
        var _this = this;
        var startCoords = {};
        var endCoords = {};
        var isMoved = false;

        // Allow x direction drag
        var allowX = false;

        // Allow Y direction drag
        var allowY = false;


        var startTime;
        var endTime;

        var dataX = 0;
        var dataY = 0;
        var possibleSwipeCords;


        var _$el;

        _this.core.$slide.on('touchstart.lg', function (e) {

            if (e.originalEvent.targetTouches.length === 1 && _this.core.$outer.hasClass('lg-zoomed')) {
                startTime = new Date();
                _this.core.touchAction = 'zoomSwipe';
                var $image = _this.core.$slide.eq(_this.core.index).find('.lg-object');

                _$el = _this.core.$slide.eq(_this.core.index).find('.lg-img-wrap');

                allowY = $image.prop('offsetHeight') * $image.attr('data-scale') > _this.core.$outer.find('.lg').height();
                allowX = $image.prop('offsetWidth') * $image.attr('data-scale') > _this.core.$outer.find('.lg').width();
                if ((allowX || allowY)) {
                    e.preventDefault();
                    startCoords = {
                        x: e.originalEvent.targetTouches[0].pageX,
                        y: e.originalEvent.targetTouches[0].pageY
                    };
                }

                dataY = _$el.attr('data-y');
                dataX = _$el.attr('data-x');

                possibleSwipeCords = _this.getPossibleSwipeCords();

                // reset opacity and transition duration
                _this.core.$outer.addClass('lg-zoom-dragging lg-zoom-drag-transition');
            }

        });

        _this.core.$slide.on('touchmove.lg', function (e) {

            if (e.originalEvent.targetTouches.length === 1 && _this.core.touchAction ==='zoomSwipe') {
                _this.core.touchAction = 'zoomSwipe';

                e.preventDefault();
                
                endCoords = {
                    x: e.originalEvent.targetTouches[0].pageX,
                    y: e.originalEvent.targetTouches[0].pageY
                };

                var distance = _this.getZoomSwipeCords(startCoords, endCoords, allowX, allowY, possibleSwipeCords, dataY, dataX);
                
                if ((Math.abs(endCoords.x - startCoords.x) > 15) || (Math.abs(endCoords.y - startCoords.y) > 15)) {
                    
                    isMoved = true;
                    _this.setZoomSwipeStyles(_$el, distance);
                }

            }

        });

        _this.core.$slide.on('touchend.lg', function () {
            if (_this.core.touchAction === 'zoomSwipe') {
                _this.core.touchAction = '';
                _this.core.$outer.removeClass('lg-zoom-dragging');
                if(!isMoved) {
                    return;
                }
                isMoved = false;
                endTime = new Date();
                var touchDuration = endTime - startTime;
                _this.touchendZoom(startCoords, endCoords, allowX, allowY, touchDuration);
            }
        });

    };

    Zoom.prototype.getZoomSwipeCords = function (startCoords, endCoords, allowX, allowY, possibleSwipeCords, dataY, dataX) {
        var distance = {};
        if (allowY) {

            distance.y = (-Math.abs(dataY)) + (endCoords.y - startCoords.y);

            if (distance.y <= -possibleSwipeCords.maxY) {
                var diffMaxY = -possibleSwipeCords.maxY - distance.y;
                distance.y = (-possibleSwipeCords.maxY) - (diffMaxY / 6);
            } else if (distance.y >= -possibleSwipeCords.minY) {
                var diffMinY = distance.y - (-possibleSwipeCords.minY);
                distance.y = (-possibleSwipeCords.minY) + (diffMinY / 6);
            }

        } else {
            distance.y = -Math.abs(dataY);
        }

        if (allowX) {
            distance.x = (-Math.abs(dataX)) + (endCoords.x - startCoords.x);
            if (distance.x <= -possibleSwipeCords.maxX) {
                var diffMaxX = -possibleSwipeCords.maxX - distance.x;
                distance.x = (-possibleSwipeCords.maxX) - (diffMaxX / 6);
            } else if (distance.x >= -possibleSwipeCords.minX) {
                var diffMinX = distance.x - (-possibleSwipeCords.minX);
                distance.x = (-possibleSwipeCords.minX) + (diffMinX / 6);
            }
        } else {
            distance.x = -Math.abs(dataX);
        }

        return distance;
    }

    Zoom.prototype.zoomDrag = function () {

        var _this = this;
        var startCoords = {};
        var endCoords = {};
        var isDraging = false;
        var isMoved = false;

        // Allow x direction drag
        var allowX = false;

        // Allow Y direction drag
        var allowY = false;


        var startTime;
        var endTime;

        var possibleSwipeCords;

        var dataY;
        var dataX;
        var _$el;

        _this.core.$slide.on('mousedown.lg.zoom', function (e) {

            startTime = new Date();

            // execute only on .lg-object
            var $image = _this.core.$slide.eq(_this.core.index).find('.lg-object');
            _$el = _this.core.$slide.eq(_this.core.index).find('.lg-img-wrap');

            allowY = $image.prop('offsetHeight') * $image.attr('data-scale') > _this.core.$outer.find('.lg').height();
            allowX = $image.prop('offsetWidth') * $image.attr('data-scale') > _this.core.$outer.find('.lg').width();

            if (_this.core.$outer.hasClass('lg-zoomed')) {
                if ($(e.target).hasClass('lg-object') && (allowX || allowY)) {
                    e.preventDefault();
                    startCoords = {
                        x: e.pageX,
                        y: e.pageY
                    };

                    possibleSwipeCords = _this.getPossibleSwipeCords();

                    isDraging = true;

                    dataY = _$el.attr('data-y');
                    dataX = _$el.attr('data-x');

                    // ** Fix for webkit cursor issue https://code.google.com/p/chromium/issues/detail?id=26723
                    _this.core.$outer.scrollLeft += 1;
                    _this.core.$outer.scrollLeft -= 1;

                    _this.core.$outer.removeClass('lg-grab').addClass('lg-grabbing lg-zoom-drag-transition lg-zoom-dragging');
                        // reset opacity and transition duration
                }
            }
        });

        $(window).on('mousemove.lg.zoom', function (e) {
            if (isDraging) {
                
                isMoved = true;
                endCoords = {
                    x: e.pageX,
                    y: e.pageY
                };

                var distance = _this.getZoomSwipeCords(startCoords, endCoords, allowX, allowY, possibleSwipeCords, dataY, dataX);

                _this.setZoomSwipeStyles(_$el, distance);
            
            }
        });

        $(window).on('mouseup.lg.zoom', function (e) {

            if (isDraging) {
                endTime = new Date();
                isDraging = false;
                _this.core.$outer.removeClass('lg-zoom-dragging');

                // Fix for chrome mouse move on click
                if (isMoved && ((startCoords.x !== endCoords.x) || (startCoords.y !== endCoords.y))) {
                    endCoords = {
                        x: e.pageX,
                        y: e.pageY
                    };
                    var touchDuration = endTime - startTime;
                    _this.touchendZoom(startCoords, endCoords, allowX, allowY, touchDuration);

                }

                isMoved = false;
            }

            _this.core.$outer.removeClass('lg-grabbing').addClass('lg-grab');

        });
    };

    Zoom.prototype.getPossibleSwipeCords = function (){

        var possibleCords = {};
        var _$lg = this.core.$outer.find('.lg');
        var $image = this.core.$slide.eq(this.core.index).find('.lg-object');

        possibleCords.minY = (_$lg.height() - $image.innerHeight()) / 2;
        possibleCords.maxY = Math.abs(($image.innerHeight() * Math.abs($image.attr('data-scale'))) - _$lg.height() + possibleCords.minY);

        possibleCords.minX = (_$lg.width() - $image.innerWidth()) / 2;

        possibleCords.maxX = Math.abs(($image.innerWidth() * Math.abs($image.attr('data-scale'))) - _$lg.width() + possibleCords.minX);
        return possibleCords;
    }

    Zoom.prototype.touchendZoom = function (startCoords, endCoords, allowX, allowY, touchDuration) {

        var distanceXnew = endCoords.x - startCoords.x;
        var distanceYnew = endCoords.y - startCoords.y;

        var speedX = Math.abs(distanceXnew) / touchDuration + 1;
        var speedY = Math.abs(distanceYnew) / touchDuration + 1;

        speedX > 2 ? speedX += 1 : speedX;
        speedY > 2 ? speedY += 1 : speedY;

        distanceXnew = distanceXnew * (speedX);
        distanceYnew = distanceYnew * (speedY);


        var _this = this;
        var _$el = _this.core.$slide.eq(_this.core.index).find('.lg-img-wrap');
        var distance = {};

        distance.x = (-Math.abs(_$el.attr('data-x'))) + (distanceXnew);
        distance.y = (-Math.abs(_$el.attr('data-y'))) + (distanceYnew);

        var possibleSwipeCords = _this.getPossibleSwipeCords();

        if ((Math.abs(distanceXnew) > 15) || (Math.abs(distanceYnew) > 15)) {
            if (allowY) {
                if (distance.y <= -possibleSwipeCords.maxY) {
                    distance.y = -possibleSwipeCords.maxY;
                } else if (distance.y >= -possibleSwipeCords.minY) {
                    distance.y = -possibleSwipeCords.minY;
                }
            }

            if (allowX) {
                if (distance.x <= -possibleSwipeCords.maxX) {
                    distance.x = -possibleSwipeCords.maxX;
                } else if (distance.x >= -possibleSwipeCords.minX) {
                    distance.x = -possibleSwipeCords.minX;
                }
            }

            if (allowY) {
                _$el.attr('data-y', Math.abs(distance.y));
            } else {
                distance.y = -Math.abs(_$el.attr('data-y'));
            }

            if (allowX) {
                _$el.attr('data-x', Math.abs(distance.x));
            } else {
                distance.x = -Math.abs(_$el.attr('data-x'));
            }

            _this.setZoomSwipeStyles(_$el, distance);

            _this.positionChanged = true;

        }
    };

    Zoom.prototype.destroy = function () {

        var _this = this;

        // Unbind all events added by lightGallery zoom plugin
        _this.core.$el.off('.lg.zoom');
        $(window).off('.lg.zoom');
        _this.core.$slide.off('.lg.zoom');
        _this.core.$el.off('.lg.tm.zoom');
        _this.resetZoom();
        clearTimeout(_this.zoomabletimeout);
        _this.zoomabletimeout = false;
    };

    $.fn.lightGallery.modules.zoom = Zoom;

})();
    