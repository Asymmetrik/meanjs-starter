/*! leaflet-filter Version: 0.2.8 */
(function(){
	"use strict";

	L.FontAwesomeToolbar = L.Class.extend({
		includes: [L.Mixin.Events],

		initialize: function (options) {
			L.setOptions(this, options);

			this._modes = {};
			this._actionButtons = [];
			this._activeMode = null;
		},

		enabled: function () {
			return this._activeMode !== null;
		},

		disable: function () {
			if (!this.enabled()) { return; }

			this._activeMode.handler.disable();
		},

		addToolbar: function (map) {
			var container = L.DomUtil.create('div', 'leaflet-draw-section'),
				buttonIndex = 0,
				buttonClassPrefix = this._toolbarClass || '',
				modeHandlers = this.getModeHandlers(map),
				i;

			this._toolbarContainer = L.DomUtil.create('div', 'leaflet-draw-toolbar leaflet-fa-toolbar leaflet-bar');
			this._map = map;

			for (i = 0; i < modeHandlers.length; i++) {
				if (modeHandlers[i].enabled) {
					this._initModeHandler(
						modeHandlers[i].handler,
						this._toolbarContainer,
						buttonIndex++,
						buttonClassPrefix,
						modeHandlers[i].title,
						modeHandlers[i].icon
					);
				}
			}

			// if no buttons were added, do not add the toolbar
			if (!buttonIndex) {
				return;
			}

			// Save button index of the last button, -1 as we would have ++ after the last button
			this._lastButtonIndex = --buttonIndex;

			// Create empty actions part of the toolbar
			this._actionsContainer = L.DomUtil.create('ul', 'leaflet-draw-actions');

			// Add draw and cancel containers to the control container
			container.appendChild(this._toolbarContainer);
			container.appendChild(this._actionsContainer);

			return container;
		},

		removeToolbar: function () {
			// Dispose each handler
			for (var handlerId in this._modes) {
				if (this._modes.hasOwnProperty(handlerId)) {
					// Unbind handler button
					this._disposeButton(
						this._modes[handlerId].button,
						this._modes[handlerId].handler.enable,
						this._modes[handlerId].handler
					);
	
					// Make sure is disabled
					this._modes[handlerId].handler.disable();
	
					// Unbind handler
					this._modes[handlerId].handler
						.off('enabled', this._handlerActivated, this)
						.off('disabled', this._handlerDeactivated, this);
				}
			}
			this._modes = {};
	
			// Dispose the actions toolbar
			for (var i = 0, l = this._actionButtons.length; i < l; i++) {
				this._disposeButton(
					this._actionButtons[i].button,
					this._actionButtons[i].callback,
					this
				);
			}
			this._actionButtons = [];
			this._actionsContainer = null;
		},
	
		_initModeHandler: function (handler, container, buttonIndex, classNamePrefix, buttonTitle, buttonIcon) {
			var type = handler.type;
	
			this._modes[type] = {};
	
			this._modes[type].handler = handler;
	
			this._modes[type].button = this._createButton({
				title: buttonTitle,
				icon: buttonIcon,
				className: classNamePrefix + '-' + type,
				container: container,
				callback: this._modes[type].handler.enable,
				context: this._modes[type].handler
			});
	
			this._modes[type].buttonIndex = buttonIndex;
	
			this._modes[type].handler
				.on('enabled', this._handlerActivated, this)
				.on('disabled', this._handlerDeactivated, this);
		},
	
		_createButton: function (options) {
			var link = L.DomUtil.create('a', options.className || '', options.container);
			if(null != options.icon){
				L.DomUtil.create('i', options.icon, link);
			}

			link.href = '#';

			if (options.text) {
				link.innerHTML = options.text;
			}

			if (options.title) {
				link.title = options.title;
			}

			L.DomEvent
				.on(link, 'click', L.DomEvent.stopPropagation)
				.on(link, 'mousedown', L.DomEvent.stopPropagation)
				.on(link, 'dblclick', L.DomEvent.stopPropagation)
				.on(link, 'click', L.DomEvent.preventDefault)
				.on(link, 'click', options.callback, options.context);

			return link;
		},

		_disposeButton: function (button, callback) {
			L.DomEvent
				.off(button, 'click', L.DomEvent.stopPropagation)
				.off(button, 'mousedown', L.DomEvent.stopPropagation)
				.off(button, 'dblclick', L.DomEvent.stopPropagation)
				.off(button, 'click', L.DomEvent.preventDefault)
				.off(button, 'click', callback);
		},

		_handlerActivated: function (e) {
			// Disable active mode (if present)
			this.disable();

			// Cache new active feature
			this._activeMode = this._modes[e.handler];

			L.DomUtil.addClass(this._activeMode.button, 'leaflet-draw-toolbar-button-enabled');

			this._showActionsToolbar();

			this.fire('enable');
		},

		_handlerDeactivated: function () {
			this._hideActionsToolbar();

			L.DomUtil.removeClass(this._activeMode.button, 'leaflet-draw-toolbar-button-enabled');

			this._activeMode = null;

			this.fire('disable');
		},

		_createActions: function (handler) {
			var container = this._actionsContainer,
				buttons = this.getActions(handler),
				l = buttons.length,
				li, di, dl, button;

			// Dispose the actions toolbar (todo: dispose only not used buttons)
			for (di = 0, dl = this._actionButtons.length; di < dl; di++) {
				this._disposeButton(this._actionButtons[di].button, this._actionButtons[di].callback);
			}
			this._actionButtons = [];

			// Remove all old buttons
			while (container.firstChild) {
				container.removeChild(container.firstChild);
			}

			for (var i = 0; i < l; i++) {
				if ('enabled' in buttons[i] && !buttons[i].enabled) {
					continue;
				}

				li = L.DomUtil.create('li', '', container);

				button = this._createButton({
					title: buttons[i].title,
					text: buttons[i].text,
					container: li,
					callback: buttons[i].callback,
					context: buttons[i].context
				});

				this._actionButtons.push({
					button: button,
					callback: buttons[i].callback
				});
			}
		},

		_showActionsToolbar: function () {
			var buttonIndex = this._activeMode.buttonIndex,
				lastButtonIndex = this._lastButtonIndex,
				toolbarPosition = this._activeMode.button.offsetTop - 1;

			// Recreate action buttons on every click
			this._createActions(this._activeMode.handler);

			// Correctly position the cancel button
			this._actionsContainer.style.top = toolbarPosition + 'px';

			if (buttonIndex === 0) {
				L.DomUtil.addClass(this._toolbarContainer, 'leaflet-draw-toolbar-notop');
				L.DomUtil.addClass(this._actionsContainer, 'leaflet-draw-actions-top');
			}

			if (buttonIndex === lastButtonIndex) {
				L.DomUtil.addClass(this._toolbarContainer, 'leaflet-draw-toolbar-nobottom');
				L.DomUtil.addClass(this._actionsContainer, 'leaflet-draw-actions-bottom');
			}

			this._actionsContainer.style.display = 'block';
		},

		_hideActionsToolbar: function () {
			this._actionsContainer.style.display = 'none';

			L.DomUtil.removeClass(this._toolbarContainer, 'leaflet-draw-toolbar-notop');
			L.DomUtil.removeClass(this._toolbarContainer, 'leaflet-draw-toolbar-nobottom');
			L.DomUtil.removeClass(this._actionsContainer, 'leaflet-draw-actions-top');
			L.DomUtil.removeClass(this._actionsContainer, 'leaflet-draw-actions-bottom');
		}
	});

})();
(function(){
	"use strict";

	L.filterLocal = {
		filter: {
			toolbar: {
				actions: {
					title: 'Cancel drawing',
					text: 'Cancel'
				},
				buttons: {
					rectangle: 'Draw a bounding box filter',
					polygon: 'Draw a bounding polygon filter',
					polyline: 'Draw a multipoint line',
					circle: 'Draw a bounding circle filter',
					disabled: 'Filter already applied',
					clear: 'Clear current filter',
					clearDisabled: 'No active filter'
				}
			},
			handlers: {
				simpleshape: {
					tooltip: {
						end: 'Release mouse to finish drawing.'
					}
				},
				rectangle: {
					tooltip: {
						start: 'Click and drag to draw rectangle.'
					}
				},
				polyline: {
					tooltip: {
						start: 'Click to draw multiple points.'
					}
				},
				polygon: {
					tooltip: {
						start: 'Click to draw polygon points.'
					}
				},
				circle: {
					tooltip: {
						start: 'Click and drag to draw circle.'
					}
				}
			}
		}
	};

})();
(function(){
	"use strict";

	L.Filter = {};

	L.Filter.Feature = L.Handler.extend({
		includes: L.Mixin.Events,

		initialize: function (map, options) {
			this._map = map;
			this._container = map._container;
			this._overlayPane = map._panes.overlayPane;
			this._popupPane = map._panes.popupPane;

			// Merge default shapeOptions options with custom shapeOptions
			if (options && options.shapeOptions) {
				options.shapeOptions = L.Util.extend({}, this.options.shapeOptions, options.shapeOptions);
			}
			L.setOptions(this, options);
		},

		enable: function () {
			if (this._enabled || this.isLocked()) { return; }
			L.Handler.prototype.enable.call(this);
			this.fire('enabled', { handler: this.type });
			this._map.fire('filter:filterstart', { layerType: this.type });
		},

		disable: function () {
			if (!this._enabled) { return; }
			L.Handler.prototype.disable.call(this);
			this._map.fire('filter:filterstop', { layerType: this.type });
			this.fire('disabled', { handler: this.type });
		},

		lock: function(){
			this._locked = true;
		},

		unlock: function(){
			this._locked = false;
		},

		isLocked: function(){
			return (null != this._locked && this._locked);
		},
	
		addHooks: function () {
			var map = this._map;
	
			if (map) {
				L.DomUtil.disableTextSelection();
				map.getContainer().focus();
				this._tooltip = new L.Tooltip(this._map);
				L.DomEvent.on(this._container, 'keyup', this._cancelDrawing, this);
			}
		},

		removeHooks: function () {
			if (this._map) {
				L.DomUtil.enableTextSelection();

				this._tooltip.dispose();
				this._tooltip = null;

				L.DomEvent.off(this._container, 'keyup', this._cancelDrawing, this);
			}
		},

		setOptions: function (options) {
			L.setOptions(this, options);
		},

		_fireCreatedEvent: function (layer) {
			this._map.fire('filter:created', { layer: layer, layerType: this.type });
		},

		// Cancel drawing when the escape key is pressed
		_cancelDrawing: function (e) {
			if (e.keyCode === 27) {
				this.disable();
			}
		}
	});

})();
(function(){
	"use strict";

	L.Filter.SimpleShape = L.Filter.Feature.extend({
		options: {
		},

		initialize: function (map, options) {
			this._endLabelText = L.filterLocal.filter.handlers.simpleshape.tooltip.end;
			L.Filter.Feature.prototype.initialize.call(this, map, options);
		},

		addHooks: function () {
			L.Filter.Feature.prototype.addHooks.call(this);
			if (this._map) {
				this._mapDraggable = this._map.dragging.enabled();

				if (this._mapDraggable) {
					this._map.dragging.disable();
				}

				//TODO refactor: move cursor to styles
				this._container.style.cursor = 'crosshair';
				this._tooltip.updateContent({ text: this._initialLabelText });

				this._map
					.on('mousedown', this._onMouseDown, this)
					.on('mousemove', this._onMouseMove, this);
			}
		},

		removeHooks: function () {
			L.Filter.Feature.prototype.removeHooks.call(this);
			if (this._map) {
				if (this._mapDraggable) {
					this._map.dragging.enable();
				}

				//TODO refactor: move cursor to styles
				this._container.style.cursor = '';

				this._map
					.off('mousedown', this._onMouseDown, this)
					.off('mousemove', this._onMouseMove, this);

				L.DomEvent.off(document, 'mouseup', this._onMouseUp, this);

				// If the box element doesn't exist they must not have moved the mouse, so don't need to destroy/return
				if (this._shape) {
					this._map.removeLayer(this._shape);
					delete this._shape;
				}
			}
			this._isDrawing = false;
		},

		_getTooltipText: function () {
			return {
				text: this._endLabelText
			};
		},

		_onMouseDown: function (e) {
			this._isDrawing = true;
			this._startLatLng = e.latlng;

			L.DomEvent
				.on(document, 'mouseup', this._onMouseUp, this)
				.preventDefault(e.originalEvent);
		},

		_onMouseMove: function (e) {
			var latlng = e.latlng;

			this._tooltip.updatePosition(latlng);
			if (this._isDrawing) {
				this._drawShape(latlng);
				this._tooltip.updateContent(this._getTooltipText());
			}
		},

		_onMouseUp: function () {
			if (this._shape) {
				this._fireCreatedEvent();
			}

			this.disable();
		}
	});

})();
(function(){
	"use strict";

	L.Filter = L.Filter || {};

	L.Filter.Rectangle = L.Filter.SimpleShape.extend({
		statics: {
			TYPE: 'rectangle'
		},

		options: {
			shapeOptions: {
				stroke: true,
				color: '#f06eaa',
				weight: 4,
				opacity: 0.5,
				fill: true,
				fillColor: null, //same as color by default
				fillOpacity: 0.2,
				clickable: true,
				editable: true
			},
			metric: true // Whether to use the metric meaurement system or imperial
		},

		initialize: function (map, options) {
			// Save the type so super can fire, need to do this as cannot do this.TYPE :(
			this.type = L.Filter.Rectangle.TYPE;
			this._initialLabelText = L.filterLocal.filter.handlers.rectangle.tooltip.start;
			L.Filter.SimpleShape.prototype.initialize.call(this, map, options);
		},

		// Get the geo representation of the current filter box
		getGeo: function(layer){
			return {
				type: 'rectangle',
				northEast: {
					lat: layer.getBounds()._northEast.lat,
					lng: layer.getBounds()._northEast.lng,
				},
				southWest: {
					lat: layer.getBounds()._southWest.lat,
					lng: layer.getBounds()._southWest.lng,
				}
			};
		},

		// Programmatic way to draw a filter rectangle (bit of a hack)
		setFilter: function(filter) {
			this.enable();

			// init
			this._isDrawing = true;
			this._startLatLng = filter.northEast;

			// Update
			var shape = this._drawShape(filter.southWest);

			// Finish
			this.disable();

			return shape;
		},

		equals: function(shape1, shape2) {
			if(shape1.type != shape2.type) {
				return false;
			}

			return (shape1.northEast.lat === shape2.northEast.lat && 
					shape1.northEast.lng === shape2.northEast.lng && 
					shape1.southWest.lat === shape2.southWest.lat && 
					shape1.southWest.lng === shape2.southWest.lng);
		},

		_drawShape: function (latlng) {
			if (!this._shape) {
				this._shape = new L.Rectangle(new L.LatLngBounds(this._startLatLng, latlng), this.options.shapeOptions);
				this._map.addLayer(this._shape);
			} else {
				this._shape.setBounds(new L.LatLngBounds(this._startLatLng, latlng));
			}

			return { type: 'rectangle', layer: this._shape };
		},

		_fireCreatedEvent: function () {
			var rectangle = new L.Rectangle(this._shape.getBounds(), this.options.shapeOptions);
			L.Filter.SimpleShape.prototype._fireCreatedEvent.call(this, rectangle);
		},

		_getTooltipText: function () {
			var tooltipText = L.Filter.SimpleShape.prototype._getTooltipText.call(this),
				shape = this._shape,
				latLngs, area, subtext;

			if (shape) {
				latLngs = this._shape.getLatLngs();
				area = L.GeometryUtil.geodesicArea(latLngs);
				subtext = L.GeometryUtil.readableArea(area, this.options.metric);
			}

			return {
				text: tooltipText.text,
				subtext: subtext
			};
		}

	});

})();
(function(){
	"use strict";

	L.Filter.Polyline = L.Filter.Feature.extend({
		
		statics: {
			TYPE: 'polyline'
		},

		Poly: L.Polyline,
		
		options: {
			allowIntersection: true,
			repeatMode: false,
			drawError: {
				color: '#b00b00',
				timeout: 2500
			},
			icon: new L.DivIcon({
				iconSize: new L.Point(8, 8),
				className: 'leaflet-div-icon leaflet-editing-icon'
			}),
			guidelineDistance: 20,
			maxGuideLineLength: 4000,
			shapeOptions: {
				stroke: true,
				color: '#f06eaa',
				weight: 4,
				opacity: 0.5,
				fill: false,
				clickable: true
			},
			metric: true, // Whether to use the metric meaurement system or imperial
			showLength: true, // Whether to display distance in the tooltip
			zIndexOffset: 2000 // This should be > than the highest z-index any map layers
		},

		initialize: function (map, options) {
			this._endLabelText = L.filterLocal.filter.handlers.polyline.tooltip.end;
			
			// Need to set this here to ensure the correct message is used.
			this.options.drawError.message = L.drawLocal.draw.handlers.polyline.error;

			// Merge default drawError options with custom options
			if (options && options.drawError) {
				options.drawError = L.Util.extend({}, this.options.drawError, options.drawError);
			}
			
			L.Filter.Feature.prototype.initialize.call(this, map, options);
		},

		addHooks: function () {
			L.Filter.Feature.prototype.addHooks.call(this);
			if (this._map) {
				
				this._markers = [];

				this._markerGroup = new L.LayerGroup();
				this._map.addLayer(this._markerGroup);

				this._poly = new L.Polyline([], this.options.shapeOptions);

				this._tooltip.updateContent(this._getTooltipText());

				// Make a transparent marker that will used to catch click events. These click
				// events will create the vertices. We need to do this so we can ensure that
				// we can create vertices over other map layers (markers, vector layers). We
				// also do not want to trigger any click handlers of objects we are clicking on
				// while drawing.
				if (!this._mouseMarker) {
					this._mouseMarker = L.marker(this._map.getCenter(), {
						icon: L.divIcon({
							className: 'leaflet-mouse-marker',
							iconAnchor: [20, 20],
							iconSize: [40, 40]
						}),
						opacity: 0,
						zIndexOffset: this.options.zIndexOffset
					});
				}

				this._mouseMarker
					.on('mousedown', this._onMouseDown, this)
					.addTo(this._map);

				this._map
					.on('mousemove', this._onMouseMove, this)
					.on('mouseup', this._onMouseUp, this)
					.on('zoomend', this._onZoomEnd, this);
			}
		},

		removeHooks: function () {
			
			L.Filter.Feature.prototype.removeHooks.call(this);
			if (this._map) {

				//TODO refactor: move cursor to styles
				this._container.style.cursor = '';

				this._map
					.off('mousedown', this._onMouseDown, this)
					.off('mousemove', this._onMouseMove, this);

				L.DomEvent.off(document, 'mouseup', this._onMouseUp, this);
				
				/*
				 * If no markers or polygons have been created, the user has not entered
				 * anything, so there is nothing to delete or remove from the map
				 */
				if(this._markerGroup) {
					this._map.removeLayer(this._markerGroup);
					delete this._markerGroup;
				}
				
				if(this._poly) {
					this._map.removeLayer(this._poly);
					delete this._poly;
				}
			}
			this._isDrawing = false;
		},

		_getTooltipText: function () {
			return {
				text: this._endLabelText
			};
		},
		
		deleteLastVertex: function () {
			if (this._markers.length <= 1) {
				return;
			}

			var lastMarker = this._markers.pop(),
				poly = this._poly,
				latlng = this._poly.spliceLatLngs(poly.getLatLngs().length - 1, 1)[0];

			this._markerGroup.removeLayer(lastMarker);

			if (poly.getLatLngs().length < 2) {
				this._map.removeLayer(poly);
			}

			this._vertexChanged(latlng, false);
		},

		addVertex: function (latlng) {
			var markersLength = this._markers.length;

			if (markersLength > 0 && !this.options.allowIntersection && this._poly.newLatLngIntersects(latlng)) {
				//TODO error state - alert user?
				return;
			}

			this._markers.push(this._createMarker(latlng));

			this._poly.addLatLng(latlng);

			if (this._poly.getLatLngs().length === 2) {
				this._map.addLayer(this._poly);
			}

			this._vertexChanged(latlng, true);
		},

		_finishShape: function () {
			var intersects = this._poly.newLatLngIntersects(this._poly.getLatLngs()[0], true);

			if ((!this.options.allowIntersection && intersects) || !this._shapeIsValid()) {
				//TODO error state - alert user?
				return;
			}

			this._fireCreatedEvent();
			this.disable();
			if (this.options.repeatMode) {
				this.enable();
			}
			
			// Remove the rubberband dashed guide line from the UI
			this._clearGuides();
			
			this._clearMouseMarker();
		},

		//Called to verify the shape is valid when the user tries to finish it
		//Return false if the shape is not valid
		_shapeIsValid: function () {
			return true;
		},

		_onZoomEnd: function () {
			this._updateGuide();
		},

		_onMouseMove: function (e) {
			var newPos = e.layerPoint,
				latlng = e.latlng;

			// Save latlng
			// should this be moved to _updateGuide() ?
			this._currentLatLng = latlng;

			this._updateTooltip(latlng);

			// Update the guide line
			this._updateGuide(newPos);

			// Update the mouse marker position
			this._mouseMarker.setLatLng(latlng);

			L.DomEvent.preventDefault(e.originalEvent);
		},

		_vertexChanged: function (latlng, added) {
			this._updateFinishHandler();

			this._updateRunningMeasure(latlng, added);

			this._clearGuides();

			this._updateTooltip();
		},

		_onMouseDown: function (e) {
			var originalEvent = e.originalEvent;
			this._mouseDownOrigin = L.point(originalEvent.clientX, originalEvent.clientY);
		},

		_onMouseUp: function (e) {
			if (this._mouseDownOrigin) {
				// We detect clicks within a certain tolerance, otherwise let it
				// be interpreted as a drag by the map
				var distance = L.point(e.originalEvent.clientX, e.originalEvent.clientY)
					.distanceTo(this._mouseDownOrigin);
				if (Math.abs(distance) < 9 /* * (window.devicePixelRatio || 1)*/) {
					this.addVertex(e.latlng);
				}
			}
			this._mouseDownOrigin = null;
		},

		_updateFinishHandler: function () {
			var markerCount = this._markers.length;
			// The last marker should have a click handler to close the polyline
			if (markerCount > 1) {
				this._markers[markerCount - 1].on('click', this._finishShape, this);
			}

			// Remove the old marker click handler (as only the last point should close the polyline)
			if (markerCount > 2) {
				this._markers[markerCount - 2].off('click', this._finishShape, this);
			}
		},

		_createMarker: function (latlng) {
			var marker = new L.Marker(latlng, {
				icon: this.options.icon,
				zIndexOffset: this.options.zIndexOffset * 2
			});

			this._markerGroup.addLayer(marker);

			return marker;
		},
		
		_updateGuide: function (newPos) {
			var markerCount = this._markers.length;

			if (markerCount > 0) {
				newPos = newPos || this._map.latLngToLayerPoint(this._currentLatLng);

				// draw the guide line
				this._clearGuides();
				this._drawGuide(
					this._map.latLngToLayerPoint(this._markers[markerCount - 1].getLatLng()),
					newPos
				);
			}
		},
		
		_updateRunningMeasure: function (latlng, added) {
			var markersLength = this._markers.length,
				previousMarkerIndex, distance;

			if (this._markers.length === 1) {
				this._measurementRunningTotal = 0;
			} else {
				previousMarkerIndex = markersLength - (added ? 2 : 1);
				distance = latlng.distanceTo(this._markers[previousMarkerIndex].getLatLng());

				this._measurementRunningTotal += distance * (added ? 1 : -1);
			}
		},

		_updateTooltip: function (latLng) {
			var text = this._getTooltipText();

			if (latLng) {
				this._tooltip.updatePosition(latLng);
			}

			if (!this._errorShown) {
				this._tooltip.updateContent(text);
			}
		},

		_drawGuide: function (pointA, pointB) {
			var length = Math.floor(Math.sqrt(Math.pow((pointB.x - pointA.x), 2) + Math.pow((pointB.y - pointA.y), 2))),
				guidelineDistance = this.options.guidelineDistance,
				maxGuideLineLength = this.options.maxGuideLineLength,
				// Only draw a guideline with a max length
				i = length > maxGuideLineLength ? length - maxGuideLineLength : guidelineDistance,
				fraction,
				dashPoint,
				dash;

			//create the guides container if we haven't yet
			if (!this._guidesContainer) {
				this._guidesContainer = L.DomUtil.create('div', 'leaflet-draw-guides', this._overlayPane);
			}

			//draw a dash every GuildeLineDistance
			for (; i < length; i += this.options.guidelineDistance) {
				//work out fraction along line we are
				fraction = i / length;

				//calculate new x,y point
				dashPoint = {
					x: Math.floor((pointA.x * (1 - fraction)) + (fraction * pointB.x)),
					y: Math.floor((pointA.y * (1 - fraction)) + (fraction * pointB.y))
				};

				//add guide dash to guide container
				dash = L.DomUtil.create('div', 'leaflet-draw-guide-dash', this._guidesContainer);
				dash.style.backgroundColor =
					!this._errorShown ? this.options.shapeOptions.color : this.options.drawError.color;

				L.DomUtil.setPosition(dash, dashPoint);
			}
		},

		_updateGuideColor: function (color) {
			if (this._guidesContainer) {
				for (var i = 0, l = this._guidesContainer.childNodes.length; i < l; i++) {
					this._guidesContainer.childNodes[i].style.backgroundColor = color;
				}
			}
		},

		/**
		 * Remove the Mouse Marker from the Map, or it will mask the click/drag
		 * events on the last placed point, preventing it from being editable after
		 * the shape is finished.
		 */
		_clearMouseMarker: function() {
			if(this._mouseMarker) {
				// remove the mouse marker from the first point placement
				this._map.removeLayer(this._mouseMarker);
				delete this._mouseMarker;
			}
		},
		
		// removes all child elements (guide dashes) from the guides container
		_clearGuides: function () {
			if (this._guidesContainer) {
				while (this._guidesContainer.firstChild) {
					this._guidesContainer.removeChild(this._guidesContainer.firstChild);
				}
			}
		},
		
		_cleanUpShape: function () {
			if (this._markers.length > 1) {
				this._markers[this._markers.length - 1].off('click', this._finishShape, this);
			}
		},

		_fireCreatedEvent: function () {
			var poly = new this.Poly(this._poly.getLatLngs(), this.options.shapeOptions);
			L.Filter.Feature.prototype._fireCreatedEvent.call(this, poly);
		}
	});

})();
(function(){
	"use strict";

	L.Filter = L.Filter || {};

	L.Filter.Polygon = L.Filter.Polyline.extend({
		statics: {
			TYPE: 'polygon'
		},
		
		Poly: L.Polygon,
		
		options: {
			showArea: false,
			shapeOptions: {
				stroke: true,
				color: '#f06eaa',
				weight: 4,
				opacity: 0.5,
				fill: true,
				fillColor: null, //same as color by default
				fillOpacity: 0.2,
				clickable: true,
				editable: true
			},
			metric: true // Whether to use the metric meaurement system or imperial
		},

		initialize: function (map, options) {
			// Save the type so super can fire, need to do this as cannot do this.TYPE :(
			this.type = L.Filter.Polygon.TYPE;
			this._initialLabelText = L.filterLocal.filter.handlers.polygon.tooltip.start;
			L.Filter.Polyline.prototype.initialize.call(this, map, options);
		},

		// Programmatic way to draw a filter rectangle (bit of a hack)
		setFilter: function(filter) {

			var shape = this._drawShape(filter.latlngs);

			return shape;
		},
		
		equals: function(shape1, shape2) {
			if(shape1.type != shape2.type) {
				return false;
			}
			
			// maintain order of nested arrays by serializing to a string, then comparing
			var shape1LatLng = JSON.stringify(shape1.latlngs),
				shape2LatLng = JSON.stringify(shape2.latlngs);
			
			return (shape1LatLng == shape2LatLng);
		},
		
		// Get the geo representation of the current filter box
		getGeo: function(layer) {
			
			return {
				type: 'polygon',
				latlngs: layer.getLatLngs()
			};
			
		},

		_drawShape: function (latlngs) {
			if (!this._poly) {
				this._poly = new L.Polygon(latlngs, this.options.shapeOptions);
				this._map.addLayer(this._poly);
			} else {
				this._poly.setLatLngs(latlngs);
			}

			return { type: 'polygon', layer: this._poly };
		},

		_fireCreatedEvent: function () {
			var polygon = new L.Polygon(this._poly.getLatLngs(), this.options.shapeOptions);
			L.Filter.Polyline.prototype._fireCreatedEvent.call(this, polygon);
		},

		_getTooltipText: function () {
			var tooltipText = L.Filter.Polyline.prototype._getTooltipText.call(this),
				shape = this._poly,
				latLngs, area, subtext;

			if (shape) {
				latLngs = shape.getLatLngs();
				area = L.GeometryUtil.geodesicArea(latLngs);
				subtext = L.GeometryUtil.readableArea(area, this.options.metric);
			}

			return {
				text: tooltipText.text,
				subtext: subtext
			};
		},
		
		_updateFinishHandler: function () {
			var markerCount = this._markers.length;

			// The first marker should have a click handler to close the polygon
			if (markerCount === 1) {
				this._markers[0].on('click', this._finishShape, this);
			}

			// Add and update the double click handler
			if (markerCount > 2) {
				this._markers[markerCount - 1].on('dblclick', this._finishShape, this);
				// Only need to remove handler if has been added before
				if (markerCount > 3) {
					this._markers[markerCount - 2].off('dblclick', this._finishShape, this);
				}
			}
		},

		_getMeasurementString: function () {
			var area = this._area;

			if (!area) {
				return null;
			}

			return L.GeometryUtil.readableArea(area, this.options.metric);
		},

		_shapeIsValid: function () {
			return this._markers.length >= 3;
		},

		_vertexChanged: function (latlng, added) {
			var latLngs;

			// Check to see if we should show the area
			if (!this.options.allowIntersection && this.options.showArea) {
				latLngs = this._poly.getLatLngs();

				this._area = L.GeometryUtil.geodesicArea(latLngs);
			}

			L.Filter.Polyline.prototype._vertexChanged.call(this, latlng, added);
		},

		_cleanUpShape: function () {
			var markerCount = this._markers.length;

			if (markerCount > 0) {
				this._markers[0].off('click', this._finishShape, this);

				if (markerCount > 2) {
					this._markers[markerCount - 1].off('dblclick', this._finishShape, this);
				}
			}
		}

	});

})();
(function(){
	"use strict";

	L.Filter = L.Filter || {};

	L.Filter.Circle = L.Filter.SimpleShape.extend({
		statics: {
			TYPE: 'circle'
		},

		options: {
			shapeOptions: {
				stroke: true,
				color: '#f06eaa',
				weight: 4,
				opacity: 0.5,
				fill: true,
				fillColor: null, //same as color by default
				fillOpacity: 0.2,
				clickable: true,
				editable: true
			},
			showRadius: true,
			metric: true // Whether to use the metric meaurement system or imperial
		},

		initialize: function (map, options) {
			// Save the type so super can fire, need to do this as cannot do this.TYPE :(
			this.type = L.Filter.Circle.TYPE;
			this._initialLabelText = L.filterLocal.filter.handlers.circle.tooltip.start;
			L.Filter.SimpleShape.prototype.initialize.call(this, map, options);
		},

		// Get the geo representation of the current filter box
		getGeo: function(layer){
			var center = layer.getLatLng();
			var radius = layer.getRadius();
			return {
				type: 'circle',
				center: center,
				radius: radius
			};
		},

		// Programmatic way to draw a filter circle
		setFilter: function(filter) {
			this._startLatLng = filter.center;

			// Render the circle
			if (!this._shape) {
				this._shape = new L.Circle(filter.center, filter.radius, this.options.shapeOptions);
				this._map.addLayer(this._shape);
			}
			else {
				this._shape.setLatLng(filter.center).setRadius(filter.radius);
			}

			return { type: 'circle', 'layer': this._shape };
		},

		equals: function(shape1, shape2) {
			if(shape1.type != shape2.type) {
				return false;
			}

			return (shape1.center.lat === shape2.center.lat &&
					shape1.center.lng === shape2.center.lng &&
					shape1.radius === shape2.radius);
		},

		_drawShape: function (latlng) {
			if (!this._shape) {
				this._shape = new L.Circle(this._startLatLng, this._startLatLng.distanceTo(latlng), this.options.shapeOptions);
				this._map.addLayer(this._shape);
			}
			else {
				this._shape.setRadius(this._startLatLng.distanceTo(latlng));
			}
			return { type: 'circle', layer: this._shape };
		},

		_fireCreatedEvent: function () {
			var circle = new L.Circle(this._shape.getLatLng(), this._shape.getRadius(), this.options.shapeOptions);
			L.Filter.SimpleShape.prototype._fireCreatedEvent.call(this, circle);
		},

		_getTooltipText: function () {
			var tooltipText = L.Filter.SimpleShape.prototype._getTooltipText.call(this),
				shape = this._shape,
				latLngs, area, subtext;

			if (shape) {
				latLngs = this._shape.getBounds();
				area = L.GeometryUtil.geodesicArea(latLngs) / 4 * Math.PI;
				subtext = L.GeometryUtil.readableArea(area, this.options.metric);
			}

			return {
				text: tooltipText.text,
				subtext: subtext
			};
		}

	});

})();
(function(){
	"use strict";

	L.Filter = L.Filter || {};

	L.Filter.Clear = L.Handler.extend({
		statics: {
			TYPE: 'clear'
		},

		includes: L.Mixin.Events,

		initialize: function (map, options) {
			L.Handler.prototype.initialize.call(this, map);
			L.Util.setOptions(this, options);
			this.type = L.Filter.Clear.TYPE;
		},

		lock: function(){
			this._locked = true;
		},

		unlock: function(){
			this._locked = false;
		},

		isLocked: function(){
			return (null != this._locked && this._locked);
		},
	
		enable: function () {
			if(!this.isLocked()){
				this._map.fire('filter:cleared');
			}
		},

		disable: function () {
		}

	});

})();
(function(){
	"use strict";

	L.Control.Filter = L.Control.extend({

		options: {
			position: 'topleft',
			filter: {
				rectangle: { test: 'foo' },
				polygon: {},
				circle: {}
			}
		},

		initialize: function (options) {
			L.Control.prototype.initialize.call(this, options);

			// Initialize toolbars
			if (L.FilterToolbar && this.options.filter) {
				this._toolbar = new L.FilterToolbar(this.options.filter);
			}
		},

		onAdd: function (map) {
			var container = L.DomUtil.create('div', 'leaflet-draw'),
				topClassName = 'leaflet-draw-toolbar-top',
				toolbarContainer;

			toolbarContainer = this._toolbar.addToolbar(map);
	
			if (toolbarContainer) {
				// Add class to the first toolbar to remove the margin
				if (!L.DomUtil.hasClass(toolbarContainer, topClassName)) {
					L.DomUtil.addClass(toolbarContainer.childNodes[0], topClassName);
				}
				container.appendChild(toolbarContainer);
			}

			// register for create events
			map.on('filter:created', this._filterCreatedHandler, this);
			map.on('filter:cleared', this._filterClearedHandler, this);

			return container;
		},

		onRemove: function (map) {
			// unregister create events
			map.off('filter:created', this._filterCreatedHandler, this);
			map.off('filter:cleared', this._filterClearedHandler, this);

			if (null != this._filterGroup) {
				// Unregister for the edit events
				this._filterGroup.shape.off('edit', this._filterUpdatedHandler, this);
			}

			this._toolbar.removeToolbar();
		},

		equals: function(shape1, shape2){
			return this._toolbar.equals(shape1, shape2);
		},

		// Public method to programatically set the state of the filter
		setFilter: function(filter){
			// Check to see if a change is being applied
			var shape1 = (null != this._filterGroup)? this._getGeo(this._filterGroup.type, this._filterGroup.shape) : undefined;
			// If there is no change, then we're just going to short circuit out of here
			if(this._toolbar.equals(shape1, filter)) {
				return;
			}

			var filterObject;
			if (null != filter) {
				// Ask the handler for the filter object
				filterObject = this._toolbar.setFilter(filter);
			}
			if (null != filterObject) {
				// Clear the old filter
				this._clearFilter(true);

				// Create the new filter
				this._createFilter(filterObject);
			}
			else {
				this._clearFilter();
			}
		},

		_createFilter: function(filter, suppressEvent) {
			//Add the created shape to the filter group
			this.options.filterGroup.addLayer(filter.layer);

			// Store the internal representation of the filter state
			this._filterGroup = { shape: filter.layer, type: filter.type };

			// Register for the edit events on the filter shape
			this._filterGroup.shape.on('edit', this._filterUpdatedHandler, this);

			// Fire the event that we've updated the filter
			if(!suppressEvent) { this._map.fire('filter:filter', { geo : this._getGeo(filter.type, filter.layer) }); }

			// Set the filtered state on the toolbar
			this._toolbar.setFiltered(true);
		},

		_clearFilter: function(suppressEvent) {
			// Remove the filter shape
			this.options.filterGroup.clearLayers();
			this._filterGroup = undefined;

			// Fire the event
			if(!suppressEvent) { this._map.fire('filter:filter', { geo: undefined }); }

			// Update the toolbar state
			this._toolbar.setFiltered(false);
		},

		_filterCreatedHandler: function(e){
			this._createFilter({ type: e.layerType, layer: e.layer});
		},

		_filterUpdatedHandler: function(){
			// Only process updates when we have a stored filter shape
			if(null != this._filterGroup){
				var payload = {
					geo: this._getGeo(this._filterGroup.type, this._filterGroup.shape)
				};
				// Only need to fire event - no need to update the toolbar
				this._map.fire('filter:filter', payload);
			}
		},

		_filterClearedHandler: function(){
			this._clearFilter();
		},

		_getGeo: function(layerType, layer){
			return this._toolbar.getGeo(layerType, layer);
		},

		setFilteringOptions: function (options) {
			this._toolbar.setOptions(options);
		}
	});

	L.Map.mergeOptions({
		drawControlTooltips: false,
		filterControl: false
	});

	L.Map.addInitHook(function () {
		if (this.options.filterControl) {
			this.filterControl = new L.Control.Filter();
			this.addControl(this.filterControl);
		}
	});

})();
(function(){
	"use strict";

	L.FilterToolbar = L.FontAwesomeToolbar.extend({

		options: {
			rectangle: {},
			polygon: {},
			circle: {}
		},

		initialize: function (options) {
			/*
			 * Override default options based on what is passed in
			 * Set the options to be the combination of what was passed in and what is default
			 */
			for (var type in this.options) {
				if (this.options.hasOwnProperty(type)) {
					if (options[type]) {
						options[type] = L.extend({}, this.options[type], options[type]);
					}
				}
			}

			// Set this.options to be options since we have already extended the options
			this.options = options;
			this._toolbarClass = 'leaflet-draw-filter';
			L.FontAwesomeToolbar.prototype.initialize.call(this, options);
		},

		getModeHandlers: function (map) {
			var handlers = [];
			if(null != L.Filter.Rectangle){
				handlers.push({
					enabled: this.options.rectangle,
					handler: new L.Filter.Rectangle(map, this.options.rectangle),
					title: L.filterLocal.filter.toolbar.buttons.rectangle,
					icon: 'fa icon-square'
				});
			}
			if(null != L.Filter.Polygon){
				handlers.push({
					enabled: this.options.polygon,
					handler: new L.Filter.Polygon(map, this.options.polygon),
					title: L.filterLocal.filter.toolbar.buttons.polygon,
					icon: 'fa icon-hex'
				});
			}
			if(null != L.Filter.Circle){
				handlers.push({
					enabled: this.options.circle,
					handler: new L.Filter.Circle(map, this.options.circle),
					title: L.filterLocal.filter.toolbar.buttons.circle,
					icon: 'fa fa-circle-o'
				});
			}
			if(null != L.Filter.Clear){
				handlers.push({
					enabled: true,
					handler: new L.Filter.Clear(map, this.options.clear),
					title: L.filterLocal.filter.toolbar.buttons.clear,
					icon: 'fa fa-trash-o'
				});
			}

			return handlers;
		},

		// Get the actions part of the toolbar
		getActions: function () {
			return [
				{
					title: L.filterLocal.filter.toolbar.actions.title,
					text: L.filterLocal.filter.toolbar.actions.text,
					callback: this.disable,
					context: this
				}
			];
		},

		setOptions: function (options) {
			L.setOptions(this, options);

			for (var type in this._modes) {
				if (this._modes.hasOwnProperty(type) && options.hasOwnProperty(type)) {
					this._modes[type].handler.setOptions(options[type]);
				}
			}
		},

		addToolbar: function (map) {
			var container = L.FontAwesomeToolbar.prototype.addToolbar.call(this, map);
			this.setFiltered(false);
			return container;
		},

		setFiltered: function(filtered){
			var type;

			if(filtered){
				for(type in this._modes) {
					// The two draw buttons are disabled when we are filtered
					L.DomUtil.addClass(this._modes[type].button, 'leaflet-disabled');
					this._modes[type].button.setAttribute('title', L.filterLocal.filter.toolbar.buttons.disabled);
					this._modes[type].handler.lock();
				}

				// Clear button is enabled
				L.DomUtil.removeClass(this._modes.clear.button, 'leaflet-disabled');
				this._modes.clear.button.setAttribute('title', L.filterLocal.filter.toolbar.buttons.clear);
				this._modes.clear.handler.unlock();

			} else {
				for(type in this._modes){
					// The two draw buttons are enabled when there are no filters
					L.DomUtil.removeClass(this._modes[type].button, 'leaflet-disabled');
					this._modes[type].button.setAttribute('title', L.filterLocal.filter.toolbar.buttons[type]);
					this._modes[type].handler.unlock();
				}

				// Clear button is disabled
				L.DomUtil.addClass(this._modes.clear.button, 'leaflet-disabled');
				this._modes.clear.button.setAttribute('title', L.filterLocal.filter.toolbar.buttons.clearDisabled);
				this._modes.clear.handler.lock();
			}
		},

		setFilter: function(filter) {
			if(null != this._modes[filter.type]) {
				return this._modes[filter.type].handler.setFilter(filter);
			} else {
				console.error('Unsupported filter type: ' + filter.type);
			}
		},

		getGeo: function(layerType, layer) {
			return this._modes[layerType].handler.getGeo(layer);
		},

		equals: function(shape1, shape2) {
			if(shape1 == null || shape1.type == null) {
				shape1 = null;
			}
			if(shape2 == null || shape2.type == null) {
				shape2 = null;
			}

			if(shape1 == null && shape2 == null) {
				return true;
			} else if(shape1 == null || shape2 == null) {
				return false;
			}

			return this._modes[shape1.type].handler.equals(shape1, shape2);
		}

	});

})();	