/*! lg-zoom - v1.0.4 - 2016-12-20
 * http://sachinchoolur.github.io/lightGallery
 * Copyright (c) 2016 Sachin N; Licensed GPLv3 */


(function($, window, document, undefined) {

    'use strict';

    var defaults = {
        scale: 1,
        zoom: true,
        actualSize: false,
        zoomIcons: false,
        enableZoomAfter: 300
    };

    var mainWindowWidth = $(window).width();

    if(mainWindowWidth > 1023) {
        defaults.zoom = false;
    }


    var Zoom = function(element) {

        this.core = $(element).data('lightGallery');

        this.core.s = $.extend({}, defaults, this.core.s);

        if (this.core.s.zoom && this.core.doCss()) {
            this.init();

            // Store the zoomable timeout value just to clear it while closing
            this.zoomabletimeout = false;

            // Set the initial value center
            this.pageX = mainWindowWidth / 2;
            this.pageY = ($(window).height() / 2) + $(window).scrollTop();
        }

        if ( !this.core.imageData ) {
            this.core.imageData = {};
        }
        return this;
    };

    Zoom.prototype.reinitialize = function() {

        var timeout;

        clearTimeout(timeout);

        var _this = this;

        var windowHeight = $(window).height();

        var windowWidth = $(window).width();

        _this.core.viewportWidth = windowWidth;

        _this.core.viewportHeight = windowHeight;
        timeout = setTimeout(function () {
            for (var index in _this.core.imageData) {
                if(_this.core.imageData.hasOwnProperty(index)){
                    var currentImg = _this.core.imageData[index];

                    var initialOffsetX = (windowWidth - currentImg.$img.width()) / 2;

                    var initialOffsetY = (windowHeight - currentImg.$img.height()) / 2;

                    initialOffsetY = window.orientation !== 0 ? initialOffsetY - 25 : initialOffsetY;

                    currentImg.initialOffsetX = initialOffsetX;

                    currentImg.initialOffsetY = initialOffsetY;

                    currentImg.width = currentImg.$img.width();

                    currentImg.height = currentImg.$img.height();

                    _this.core.setImageInfo(index);

                    _this.fitImage(index, false);

                    _this.core.setTranslate(currentImg.$img, initialOffsetX, initialOffsetY);

                }
                if (_this.core.$slide.hasClass('lg-complete')){
                    _this.fitImage(index, true)
                }
            }
        },300);


    };

    Zoom.prototype.init = function() {
        var _this = this;
        var zoomIcons;

        if (_this.core.s.zoomIcons) {
            zoomIcons = '<span id="lg-zoom-in" class="lg-icon"></span><span id="lg-zoom-out" class="lg-icon"></span>';
        }

        if (_this.core.s.actualSize) {
            zoomIcons += '<span id="lg-actual-size" class="lg-icon"></span>';
        }

        this.core.$outer.find('.lg-toolbar').append(zoomIcons);

        if (mainWindowWidth < 768){
            _this.core.$el.on('onBeforeSlide.lg', function(e, prevIndex, index) {
                _this.reinitialize();
            });
        }

        _this.core.$el.off('onBeforeSlide.lg.tm.zoom').on('onBeforeSlide.lg.tm.zoom', function(e, prevIndex, index) {
            _this.fitImage(prevIndex, true);
        });

        _this.core.$el.on('onSlideItemLoad.lg.tm.zoom', function(event, index, delay) {
            _this.savePosition(index);

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

            _this.zoomabletimeout = setTimeout(function() {
                if (mainWindowWidth < 980) {
                    _this.core.$slide.eq(index).addClass('lg-zoomable');
                }
            }, _speed + 30);
        });

        _this.core.$slide.on('dblclick', '.lg-image', function(e) {
            _this.actualSize(e);
        });

        // Fingers counter
        var fingers = 0,
            tapped = false;
        _this.core.$slide.on('touchstart','.lg-image', function(e) {
            e.preventDefault();

            fingers = (e.originalEvent.touches && e.originalEvent.touches.length);

            if (fingers === 1) // zoom on dblclick
            {
                if (!tapped) {
                    tapped = setTimeout(function() {
                        tapped = null;
                    }, 300);
                } else {
                    clearTimeout(tapped);
                    tapped = null;
                    _this.actualSize(e);
                }
            }
        });
        var resize_t;
        $(window).off('resize.lg_zoom orientationchange.lg_zoom').on('resize.lg_zoom orientationchange.lg_zoom resize', function() {
            _this.reinitialize();
        });

        if (_this.core.s.zoomIcons) {

            $('#lg-zoom-out').off('click.lg').on('click.lg', function() {
                var current = _this.core.imageData[_this.core.index];
                var scale = +current.$wrap.attr('data-scale') || 1;
                if (_this.core.$outer.find('.lg-current .lg-image').length) {
                    scale -= 1 || 1;
                    _this.zoom(scale);
                    _this.fitImage();
                }
            });

            $('#lg-zoom-in').off('click.lg').on('click.lg', function() {
                var current = _this.core.imageData[_this.core.index];
                var scale = +current.$wrap.attr('data-scale') || 1;
                if (_this.core.$outer.find('.lg-current .lg-image').length) {
                    scale += 1;
                    _this.zoom(scale);
                    _this.fitImage();
                }
            });
        }

        if (_this.core.s.actualSize) {

            $('#lg-actual-size').off('click.lg').on('click.lg', function(e) {
                _this.actualSize(e, true);
            });
        }

        if (_this.core.isTouch) {
            _this.zoomPitch();
        } else {
            _this.mouseDrag();
            _this.scrollZoom();
        }
    };

    Zoom.prototype.zoomPitch = function() {
        var _this = this,
            current,
            startCoords,
            endCoords,
            centerCoords,
            initialDistance = 0,
            currentDistance = 0,
            scale = 1,
            touches = [],
            isTouched = false,
            isPitched = false;
        _this.core.$slide.off('touchstart.lg_zoom_pitch').on('touchstart.lg_zoom_pitch', touchStart_zoompitch);
        _this.core.$slide.off('touchmove.lg_zoom_pitch').on('touchmove.lg_zoom_pitch', touchMove_zoompitch);
        _this.core.$slide.off('touchend.lg_zoom_pitch').on('touchend.lg_zoom_pitch', touchEnd_zoompitch);

        function touchStart_zoompitch(e) {
            if (_this.core.isDraging) return;
            var _coords = _getCoords(e);

            current = _this.core.imageData[_this.core.index];
            scale = +current.$img.attr('data-scale') || current.scale || 1;
            if (!isTouched) {
                isTouched = true;
                startCoords = _coords[0];
                current = _this.core.imageData[_this.core.index];
            }

            if ( !isPitched && _coords.length >= 2 ) {
                isPitched = true;
                _this.savePosition();
                startCoords = _getCenterPoint(_coords);
            }

            if (_this.isZoomed) {

                e.preventDefault();

            }

            initialDistance = _getDistance(_coords);
        }

        function touchMove_zoompitch(e) {
            if (_this.core.isDraging) return;

            e.preventDefault();

            var _coords = _getCoords(e);

            var moveX = 0, moveY = 0;

            var newScale = scale,
                percent;

            endCoords = _coords[0];

            _this.core.$outer.addClass('lg-zoom-dragging lg-no-trans');

            centerCoords = _getCenterPoint(_coords);

            currentDistance = _getDistance(_coords);

            if (_coords.length === 2) {

                var diff = currentDistance - initialDistance;

                percent = Math.floor(diff*100/_this.core.viewportHeight) * 4;
                newScale = scale * parseFloat((100 + percent) / 100);
            }

            if (_this.isZoomed) {
                moveX = (centerCoords.x - startCoords.x);
                moveY = (centerCoords.y - startCoords.y);
            }

            if (scale !== newScale || (_this.isZoomed && (moveX || moveY))) {
                _this.zoom(newScale, centerCoords.x, centerCoords.y , moveX, moveY);
            }
        }

        function touchEnd_zoompitch(e) {
            if (_this.core.isDraging) return;

            var _coords = _getCoords(e);

            scale = +current.$img.attr('data-scale');


            if (_coords.length === 1) {
                startCoords = _coords[0];
                endCoords = _coords[0];

                _this.savePosition();
            }

            if (_coords.length <= 1) {
                isPitched = false;
            }

            if (_coords.length === 0) {
                isTouched = false;

                _this.fitImage();
            }
        }

        function _getCoords(e) {
            if ( !e.originalEvent.touches ) return false;
            var touches = [];

            for (var t in e.originalEvent.touches) {
                if(e.originalEvent.touches.hasOwnProperty(t)){
                    var touch = e.originalEvent.touches[t];

                    if (!touch.clientX) continue;

                    touches.push({
                        x: touch.clientX,
                        y: touch.clientY
                    });
                }
            }
            return touches;
        }

        function _getCenterPoint(points) {
            var x = 0, y = 0;

            points.forEach(function(t) {
                x += t.x;
                y += t.y;
            });

            return {
                x: x/points.length,
                y: y/points.length
            };
        }

        function _getDistance(points) {
            if (points.length > 1) {
                return Math.sqrt(Math.pow((points[1].x - points[0].x), 2)  + Math.pow((points[1].y - points[0].y), 2));
            } else {
                return 0;
            }
        }
    };

    Zoom.prototype.scrollZoom = function() {
        var _this = this;

        var scroll_t;
        _this.core.$slide.off('mousewheel.lg_zoom').on('mousewheel.lg_zoom', function(e) {

            var event = e.originalEvent;
            var current = _this.core.imageData[_this.core.index];
            if (!current) return;
            if (_this.core.isDraging) return;

            var scale = +current.$img.attr('data-scale') || 1;

            var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail))) / 10 * (scale + 1);
            var newScale = scale + delta;
            var pageX = event.pageX;
            var pageY = event.pageY;

            if ( newScale > current.maxScale) return;

            _this.zoom(newScale, pageX, pageY);
            _this.savePosition();

            clearTimeout(scroll_t);
            scroll_t = setTimeout(function () {
                _this.fitImage();
            }, 150);

            e.preventDefault();
        });
    };

    Zoom.prototype.mouseDrag = function() {
        var _this = this;
        var startCoords = {};
        var endCoords = {};
        var isDraging = false;

        _this.core.$slide.on('mousedown.lg_zoom', function(e) {
            var current = _this.core.imageData[_this.core.index];

            if (_this.isZoomed) {
                if ($(e.target).hasClass('lg-object')) {
                    e.preventDefault();
                    startCoords = {
                        x: e.pageX,
                        y: e.pageY
                    };

                    isDraging = true;

                    // ** Fix for webkit cursor issue https://code.google.com/p/chromium/issues/detail?id=26723
                    _this.core.$outer.scrollLeft += 1;
                    _this.core.$outer.scrollLeft -= 1;

                    _this.core.$outer.removeClass('lg-grab').addClass('lg-grabbing');
                }
            }
        });

        $(window).on('mousemove.lg_zoom', function(e) {
            if (isDraging) {
                var current = _this.core.imageData[_this.core.index];
                var offsetX;
                var offsetY;

                endCoords = {
                    x: e.pageX,
                    y: e.pageY
                };

                // reset opacity and transition duration
                _this.core.$outer.addClass('lg-zoom-dragging');

                offsetX = (endCoords.x - startCoords.x);
                offsetY = (endCoords.y - startCoords.y);

                _this.zoom(current.scale, 0, 0, offsetX, offsetY);
            }
        });

        $(window).on('mouseup.lg_zoom', function(e) {
            if (isDraging) {
                isDraging = false;

                _this.fitImage();
            }

            if (_this.core.s.enableDrag || _this.isZoomed) {
                _this.core.$outer.removeClass('lg-grabbing').addClass('lg-grab');
            }
        });
    };

    Zoom.prototype.checkPosition = function(strict, offsetX, offsetY, scale, index) {
        var _this = this;
        var minX = 0,
            minY = 0,
            maxX,
            maxY;

        if (typeof index === "undefined") index = _this.core.index;
        var current = _this.core.imageData[index];
        if (!current) return;

        scale = scale || +current.$img.attr('data-scale') || 1;

        if (scale > current.maxScale) {
            scale = current.maxScale;
        }

        if (strict) {
            if (scale < 1) {
                scale = 1;
            }
        }
        else {
            if (scale < 1) {
                scale = 1 - (1 - scale) * 0.2;
                if (scale < 0.5) scale = 0.5;
            }
        }

        var imageWidth = current.width * scale;
        var imageHeight = current.height * scale;
        var allowX = imageWidth > _this.core.viewportWidth;
        var allowY = imageHeight > _this.core.viewportHeight;

        if ( !allowX ) {
            minX = (_this.core.viewportWidth - imageWidth)/2;
            maxX = minX;
        }
        else {
            minX = 0;
            maxX = (_this.core.viewportWidth - imageWidth);
        }

        if ( !allowY ) {
            minY = ($(window).height() - imageHeight)/2;
            maxY = minY;
        }
        else {
            minY = 0;
            maxY = (_this.core.viewportHeight - imageHeight);
        }

        if ( !strict ) {
            var distanceX, distanceY, delim = 0.05 * scale;
            if (offsetX >= 0) {
                distanceX = (offsetX - minX) * delim;
            } else {
                distanceX = (offsetX - maxX) * delim;
            }

            if (offsetY >= 0) {
                distanceY = (offsetY - minY) * delim;
            } else {
                distanceY = (offsetY - maxY) * delim;
            }

            minX += distanceX;
            maxX += distanceX;
            minY += distanceY;
            maxY += distanceY;
        }
        if (offsetX > minX) {
            offsetX = minX;
        } else if (offsetX < maxX) {
            offsetX = maxX;
        }
        if (offsetY > minY) {
            offsetY = minY;
        } else if (offsetY < maxY) {
            offsetY = maxY;
        }
        return { x: offsetX, y: offsetY, scale: scale };
    };

    Zoom.prototype.actualSize = function(event, fromIcon) {
        var _this = this;

        var index = _this.core.index;
        var current = _this.core.imageData[index];
        if ( !current ) return;

        var scale = +current.$img.attr('data-scale') || 1;
        var x, y;

        if ( _this.isZoomed ) {
            scale = 1;
        } else {
            scale = current.maxScale;
        }

        if ( !fromIcon ) {
            x = event.pageX || event.originalEvent.targetTouches[0].pageX;
            y = (event.pageY || event.originalEvent.targetTouches[0].pageY) - $(window).scrollTop();
        }

        _this.zoom(scale, x, y);
        _this.savePosition();

        setTimeout(function() {
            if (!_this.core.s.enableDrag && !_this.isZoomed) {
                _this.core.$outer.removeClass('lg-grab lg-grabbing');
            } else {
                _this.core.$outer.removeClass('lg-grabbing').addClass('lg-grab');
            }
        }, 10);
    };

    Zoom.prototype.fitImage = function(index, initial) {
        var _this = this;

        if (typeof index === "undefined") {
            index = this.core.index;
        }

        if ( !_this.core.imageData ) return;
        var current = _this.core.imageData[index];
        if (!current) return;

        _this.core.$outer.removeClass('lg-zoom-dragging lg-no-trans');

        var offsetX = current.initialOffsetX;
        var offsetY = current.initialOffsetY;
        var scale = 1;


        offsetX = +current.$img.attr('data-x') || offsetX;
        offsetY = +current.$img.attr('data-y') || offsetY;
        scale = +current.$img.attr('data-scale') || scale;

        var pos = _this.checkPosition(true, offsetX, offsetY, scale, index);
        _this.setPosition(pos.x, pos.y, pos.scale, index);

        if (mainWindowWidth === 768) {
            _this.setPosition(pos.x, pos.y-40, pos.scale, index);
        }
        current.$img.css('margin-top','0');
        _this.savePosition();

        if (pos.scale <= 1) _this.isInZoom = false;
    };

    Zoom.prototype.zoom = function(scale, pageX, pageY, moveX, moveY) {
        var _this = this;
        var current = this.core.imageData[this.core.index];
        if ( !current || !scale ) return;

        var x, y;

        if (scale > current.maxScale) scale = current.maxScale;

        if ( !pageX || !pageY) {
            pageX = _this.core.viewportWidth / 2;
            pageY = _this.core.viewportHeight / 2;
        }


        var scaleDiff = scale/current.scale;
        x = current.offsetX + ((current.offsetX - pageX) * (scaleDiff - 1));
        y = current.offsetY + ((current.offsetY - pageY) * (scaleDiff - 1));

        var inMove = (typeof moveX !== "undefined" && typeof moveY !== "undefined");
        if (inMove) {
            x += moveX * scaleDiff;
            y += moveY * scaleDiff;
        }

        var pos = _this.checkPosition(false, x, y, scale);
        if(mainWindowWidth > 767){
            _this.setPosition(pos.x, pos.y - 50, pos.scale);
        } else {
            _this.setPosition(pos.x, pos.y, pos.scale);
        }

        _this.isInZoom = true;
        _this.isZoomed = (pos.scale > 1);
        _this.core.$outer.toggleClass('lg-zoomed', (scale > 1));
        _this.core.$outer.toggleClass('lg-zoom-max', (scale >= current.maxScale));
        _this.core.$slide.removeAttr('style');

    };

    Zoom.prototype.savePosition = function(index) {
        var _this = this;

        index = (typeof index !== "undefined") ? index : this.core.index;
        var current = _this.core.imageData[index];
        if ( !current ) return;

        current.scale = +current.$img.attr('data-scale') || 1;
        current.offsetX = +current.$img.attr('data-x') || current.initialOffsetX;
        current.offsetY = +current.$img.attr('data-y') || current.initialOffsetY;
    };

    Zoom.prototype.resetZoom = function(index) {
        var _this = this;

        index = (typeof index !== "undefined") ? index : this.core.index;
        var current = _this.core.imageData[index];
        if ( !current ) return;

        this.core.$outer.removeClass('lg-zoomed');
        this.isZoomed = false;
        this.isInZoom = false;

        this.zoom(1, 0, 0, index);
        this.savePosition(index);
    };

    Zoom.prototype.setPosition = function(x, y, scale, index) {
        var _this = this;
        if (typeof index === "undefined") index = _this.core.index;
        var current = _this.core.imageData[index];
        scale = scale || (current.$img.attr('data-scale')) || 1;
        x = Math.floor(x) || 0;
        y = Math.floor(y) || 0;

        if (scale > 1.75) {
            y = Math.floor(y) + 40 || 0;

            $('.lg-image').css({
                display: 'none',
                visibility: 'hidden'
            });
        } else if (scale < 1.75){
            y = Math.floor(y);

            $('.lg-image').css({
                display: 'block',
                visibility: 'visible'
            });
        }

        if (window.orientation !== 0) {
            y = Math.floor(y) - 25 || 0;
        }

        current.$img
            .css({
                transform: 'translate3d(' + x + 'px, ' + y + 'px, 0) scale('+ scale +')'
            }).attr('data-x', x).attr('data-y', y).attr('data-scale', scale);

    };

    Zoom.prototype.destroy = function() {

        var _this = this;

        // Unbind all events added by lightGallery zoom plugin
        _this.core.$el.off('.lg_zoom');
        $(window).off('.lg_zoom');
        _this.core.$slide.off('.lg_zoom');
        _this.core.$el.off('.lg.tm.zoom');
        _this.resetZoom();
        clearTimeout(_this.zoomabletimeout);
        _this.zoomabletimeout = false;
    };
    setTimeout(
        function() {
            $.fn.lightGallery.modules.zoom = Zoom;
        },
        300
    );

})(jQuery, window, document);
