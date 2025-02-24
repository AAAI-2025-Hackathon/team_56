const MAGMA = {
    state: {
        streetViewPanorama: null,
        streetViewService: null,
        maps: {
            topo: null,
            geo: null
        },
        layers: {},
        markers: []
    },

    initialize: function() {
        // Initialize in correct order
        this.initializeStreetView();
        this.initializeTopoMap();
        this.initializeGeoMap();
        this.setupEventListeners();
        
        console.log('MAGMA initialized successfully');
    },

    initializeStreetView: function() {
        const defaultLocation = window.defaultLocation;
        const streetViewDiv = document.getElementById('street-view');
        
        this.state.streetViewService = new google.maps.StreetViewService();
        this.state.streetViewPanorama = new google.maps.StreetViewPanorama(
            streetViewDiv,
            {
                position: defaultLocation,
                pov: {
                    heading: 165,
                    pitch: 0
                },
                zoom: 1,
                visible: true
            }
        );

        // Set initial Street View location
        this.state.streetViewService.getPanorama(
            {
                location: defaultLocation,
                radius: 50
            },
            (data, status) => {
                if (status === "OK") {
                    this.state.streetViewPanorama.setPosition(data.location.latLng);
                } else {
                    console.log("Street View data not found for initial location");
                }
            }
        );
    },

    initializeTopoMap: function() {
        const defaultLocation = window.defaultLocation;
    
      
        const usCenter = [39.8283, -98.5795]; 
        const usZoomLevel = 4; 
    
        this.state.maps.topo = L.map('topo-map').setView(usCenter, usZoomLevel);
        
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: 'Map data: © OpenTopoMap contributors'
        }).addTo(this.state.maps.topo);
    },


    initializeGeoMap: function() {
        const defaultLocation = window.defaultLocation;
    
        // Define the center and zoom level for the US
        const usCenter = [39.8283, -98.5795]; 
        const usZoomLevel = 4; 
    
        // Initialize the map and set its view
        this.state.maps.geo = L.map('geo-map').setView(usCenter, usZoomLevel);
        
        // Base layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors',
            opacity: 0.3
        }).addTo(this.state.maps.geo);
    
        // Geological layer
        L.tileLayer('https://tiles.macrostrat.org/carto/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: 'Geological data: © Macrostrat',
            opacity: 1.0
        }).addTo(this.state.maps.geo);
    },
    

    setupEventListeners: function() {
        // Map click handlers
        this.state.maps.topo.on('click', (e) => this.handleMapClick(e));
        this.state.maps.geo.on('click', (e) => this.handleMapClick(e));

        // Map synchronization
        this.state.maps.topo.on('moveend', () => {
            const center = this.state.maps.topo.getCenter();
            const zoom = this.state.maps.topo.getZoom();
            this.state.maps.geo.setView(center, zoom, { animate: false });
        });

        this.state.maps.geo.on('moveend', () => {
            const center = this.state.maps.geo.getCenter();
            const zoom = this.state.maps.geo.getZoom();
            this.state.maps.topo.setView(center, zoom, { animate: false });
        });
    },

    handleMapClick: function(e) {
        const { lat, lng } = e.latlng;
        
        // Update coordinate display
        document.getElementById('lat').textContent = lat.toFixed(6);
        document.getElementById('lng').textContent = lng.toFixed(6);

        // Update Street View
        this.updateStreetView(lat, lng);

        // Load geological data
        this.loadGeologicalData(lat, lng);
    },

    updateStreetView: function(lat, lng) {
        console.log('Updating Street View for:', lat, lng);
        
        const streetViewDiv = document.getElementById('street-view');
    
        this.state.streetViewService.getPanorama(
            {
                location: {lat: lat, lng: lng},
                radius: 50
            },
            (data, status) => {
                if (status === "OK") {
                    console.log('Street View data found');
                    
                    // Clear the div first
                    streetViewDiv.innerHTML = '';
                    
                    // Reinitialize panorama
                    this.state.streetViewPanorama = new google.maps.StreetViewPanorama(
                        streetViewDiv,
                        {
                            position: data.location.latLng,
                            pov: {
                                heading: 0,
                                pitch: 0
                            },
                            zoom: 1,
                            visible: true,
                            fullscreenControl: true,
                            linksControl: true,
                            panControl: true,
                            addressControl: true
                        }
                    );
                } else {
                    console.log('Street View data not found, trying larger radius');
                    
                    this.state.streetViewService.getPanorama(
                        {
                            location: {lat: lat, lng: lng},
                            radius: 500
                        },
                        (data, status) => {
                            if (status === "OK") {
                                // Clear the div first
                                streetViewDiv.innerHTML = '';
                                
                                // Reinitialize panorama
                                this.state.streetViewPanorama = new google.maps.StreetViewPanorama(
                                    streetViewDiv,
                                    {
                                        position: data.location.latLng,
                                        pov: {
                                            heading: 0,
                                            pitch: 0
                                        },
                                        zoom: 1,
                                        visible: true,
                                        fullscreenControl: true,
                                        linksControl: true,
                                        panControl: true,
                                        addressControl: true
                                    }
                                );
                            } else {
                                streetViewDiv.innerHTML = `
                                    <div class="no-streetview-message">
                                        <p>Street View is not available at this location</p>
                                        <p>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                                        <p>Try clicking closer to a road or populated area</p>
                                    </div>
                                `;
                            }
                        }
                    );
                }
            }
        );
    },

    
    initializeTools: function() {
        // Add measurement control
        const measureControl = L.control({position: 'topleft'});
        measureControl.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'measure-control');
            div.innerHTML = '<button class="map-button" onclick="GeoExplorer.toggleMeasurement()">📏 Measure</button>';
            return div;
        };
        measureControl.addTo(this.state.maps.topo);

        // Add export control
        const exportControl = L.control({position: 'bottomright'});
        exportControl.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'export-control');
            div.innerHTML = '<button class="map-button" onclick="GeoExplorer.exportData()">💾 Export</button>';
            return div;
        };
        exportControl.addTo(this.state.maps.topo);
    },


    setupMapSync: function() {
        // Sync topo to geo
        this.state.maps.topo.on('moveend', () => {
            if (!this.state.syncLock) {
                this.state.syncLock = true;
                const center = this.state.maps.topo.getCenter();
                const zoom = this.state.maps.topo.getZoom();
                this.state.maps.geo.setView(center, zoom, { animate: false });
                setTimeout(() => this.state.syncLock = false, 200);
            }
        });

        // Sync geo to topo
        this.state.maps.geo.on('moveend', () => {
            if (!this.state.syncLock) {
                this.state.syncLock = true;
                const center = this.state.maps.geo.getCenter();
                const zoom = this.state.maps.geo.getZoom();
                this.state.maps.topo.setView(center, zoom, { animate: false });
                setTimeout(() => this.state.syncLock = false, 200);
            }
        });
    },


    loadGeologicalData: async function(lat, lng) {
        console.log('Loading geological data for coordinates:', lat, lng);
        try {
            // First fetch geological data
            const geologicResponse = await fetch(`https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lng=${lng}`);
            const geologicData = await geologicResponse.json();
            console.log('Received geological data:', geologicData);
    
            // Check if we have valid data
            if (!geologicData.success || !geologicData.success.data || geologicData.success.data.length === 0) {
                console.log('No geological data found for this location');
                this.displayNoGeologicalData(lat, lng);
                return;
            }
    
            // Display the data we received
            this.displayGeologicalInfo(geologicData);
    
            // Fetch LLM description
            try {
                const descriptionResponse = await fetch('/api/description', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        lat: lat,
                        lng: lng,
                        geological_data: geologicData
                    })
                });
                
                const descriptionData = await descriptionResponse.json();
                console.log('Received LLM description:', descriptionData);
    
                if (descriptionData.success) {
                    
                    this.displayGeologicalDescription(descriptionData.description);
                } else {
                    console.warn('LLM description generation failed:', descriptionData.error);
                }
            } catch (error) {
                console.error('Error getting LLM description:', error);
            }
    
            // Now fetch additional context about the area
            const legendResponse = await fetch(`https://macrostrat.org/api/v2/geologic_units/map/legend?lat=${lat}&lng=${lng}`);
            const legendData = await legendResponse.json();
            console.log('Received legend data:', legendData);
    
            // Update the display with legend information
            this.updateGeologicalDisplay(geologicData, legendData);
    
        } catch (error) {
            console.error('Error loading geological data:', error);
            this.showError('Failed to load geological data. Please try again.');
        }
    },
  
    displayGeologicalDescription: function(description) {
        const descriptionContainer = document.getElementById('detailed-description');
        if (descriptionContainer) {
            descriptionContainer.innerHTML = `
                <h3>Detailed Analysis</h3>
                <div class="analysis-content">
                    ${description.replace(/\n/g, '<br>')}
                </div>
            `;
        } else {
            console.warn('Description container not found in DOM');
        }
    },
    
    displayNoGeologicalData: function(lat, lng) {
        const infoDiv = document.getElementById('rock-units');
        infoDiv.innerHTML = `
            <div class="no-data-message">
                <h3>No Geological Data Available</h3>
                <p>Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                <p>This area might be:</p>
                <ul>
                    <li>Outside mapped geological survey areas</li>
                    <li>In an ocean or water body</li>
                    <li>In an area with insufficient geological mapping</li>
                </ul>
                <p>Try clicking in a different location or zoom to a different area.</p>
            </div>
        `;
    },

    
    displayGeologicalInfo: function(data) {
        const infoDiv = document.getElementById('rock-units');
        
        // Start with a clear organization of our information
        infoDiv.innerHTML = `
            <h2>Geological Information</h2>
            <div class="geology-navigation">
                <button class="geo-tab active" data-tab="basic">Rock Units</button>
                <button class="geo-tab" data-tab="fossils">Fossils</button>
                <button class="geo-tab" data-tab="stratigraphy">Stratigraphy</button>
            </div>
            <div class="geology-content"></div>
        `;
    

    },

    /**
     * Display basic geological information in the UI
     */
    displayGeologicalInfo: function(data) {
        const infoDiv = document.getElementById('rock-units');
        infoDiv.innerHTML = '<h3>Basic Geological Information</h3>';

        if (data.success && data.success.data && data.success.data.length > 0) {
            this.state.selectedUnits = data.success.data;
            
            const basicInfoDiv = document.createElement('div');
            basicInfoDiv.className = 'basic-geology';
            
            data.success.data.forEach(unit => {
                const unitDiv = document.createElement('div');
                unitDiv.className = 'rock-unit';
                unitDiv.innerHTML = `
                    <h4>${unit.name || 'Geological Unit'}</h4>
                    <p><strong>Age:</strong> ${unit.t_age} to ${unit.b_age} Ma</p>
                    <p><strong>Rock Types:</strong> ${unit.lith || 'Not specified'}</p>
                    <p><strong>Environment:</strong> ${unit.environ || 'Not specified'}</p>
                `;
                basicInfoDiv.appendChild(unitDiv);
            });
            
            infoDiv.appendChild(basicInfoDiv);
        } else {
            infoDiv.innerHTML += '<p>No geological data available for this location</p>';
        }
    },

    displayGeologicalInfo: function(data) {
        const infoDiv = document.getElementById('rock-units');
        
        // Clear previous content
        infoDiv.innerHTML = `
            <h2>Rocks at clicked point from geologic map</h2>
            <p class="subtitle">Multiple sources as using maps of different resolutions</p>
        `;
    
        if (data.success && data.success.data && data.success.data.length > 0) {
            // Create a container for the geological cards
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'geology-cards';
            
            data.success.data.forEach(unit => {
                const card = document.createElement('div');
                card.className = 'geology-card';
                
                card.innerHTML = `
                    <h3 class="rock-name">${unit.name || 'Unnamed Unit'}</h3>
                    <div class="rock-details">
                        <p class="age-line">AGE: ${unit.strat_name || 'Unknown'}</p>
                        <p class="age-range">AGE: ${unit.t_age || 0} to ${unit.b_age || 0} millions years</p>
                        <p class="lithology">Lith: ${unit.lith || 'sedimentary'}</p>
                        <p class="source-id">source ID =${unit.source_id || 'N/A'}</p>
                    </div>
                `;
                
                cardsContainer.appendChild(card);
            });
            
            infoDiv.appendChild(cardsContainer);
        } else {
            infoDiv.innerHTML += '<p>No geological data available for this location</p>';
        }
    },
    
   
    displayDetailedDescription: function(description) {
        // Configuration for description length and quality
        const maxDescriptionLength = 2000;  
        const minSentenceLength = 100;      
        
        let detailedDiv = document.getElementById('detailed-geology');
        if (!detailedDiv) {
            detailedDiv = document.createElement('div');
            detailedDiv.id = 'detailed-geology';
            detailedDiv.className = 'detailed-geology';
            document.getElementById('rock-units').appendChild(detailedDiv);
        }
        
        // Process and validate the description
        let processedDescription = description;
        
        // Ensure minimum content length
        if (processedDescription.length < minSentenceLength) {
            processedDescription += " Additional geological analysis is needed for a complete understanding of this location's features and history.";
        }
        
        // Trim to maximum length while maintaining complete sentences
        if (processedDescription.length > maxDescriptionLength) {
            // Find the last complete sentence within length limit
            const sentenceEndings = ['.', '!', '?'];
            let lastValidEnd = 0;
            
            for (let i = 0; i < maxDescriptionLength; i++) {
                if (sentenceEndings.includes(processedDescription[i])) {
                    lastValidEnd = i + 1;
                }
            }
            
            processedDescription = processedDescription.substring(0, lastValidEnd);
        }
        
      
        const sentenceEndings = ['.', '!', '?'];
        const lastChar = processedDescription.trim().slice(-1);
        if (!sentenceEndings.includes(lastChar)) {
            const lastSentenceEnd = Math.max(
                ...sentenceEndings.map(ending => 
                    processedDescription.lastIndexOf(ending)
                )
            );
            
            if (lastSentenceEnd > 0) {
                processedDescription = processedDescription.substring(0, lastSentenceEnd + 1);
            }
        }
        
        // Format and display the content
        detailedDiv.innerHTML = `
            <div class="geology-section">
                <h3>Detailed Geological Analysis</h3>
                <div class="geology-content">
                    <p class="description-text">${processedDescription}</p>
                    
                    ${this.state.selectedUnits.length > 0 ? `
                        <div class="geological-context">
                            <h4>Geological Time Context</h4>
                            <p>The rocks in this area span from approximately 
                               ${this.state.selectedUnits[0].b_age} to 
                               ${this.state.selectedUnits[0].t_age} million years ago.</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
   
    /**
     * Toggle measurement mode on/off
     */
    toggleMeasurement: function() {
        this.state.measurementMode = !this.state.measurementMode;
        if (!this.state.measurementMode) {
            this.clearMeasurements();
        }
    },

    /**
     * Add a measurement point and calculate distance if needed
     */
    addMeasurementPoint: function(lat, lng) {
        this.state.measurePoints.push([lat, lng]);
        
        const marker = L.marker([lat, lng]).addTo(this.state.maps.topo);
        this.state.markers.push(marker);

        if (this.state.measurePoints.length > 1) {
            const points = this.state.measurePoints;
            const line = L.polyline(points, {color: 'red'}).addTo(this.state.maps.topo);
            this.state.markers.push(line);
            
            const distance = this.calculateDistance(
                points[points.length - 2],
                points[points.length - 1]
            );

            L.popup()
                .setLatLng(points[points.length - 1])
                .setContent(`Distance: ${distance.toFixed(2)} km`)
                .openOn(this.state.maps.topo);
        }
    },

    /**
     * Clear all measurements from the map
     */
    clearMeasurements: function() {
        this.state.measurePoints = [];
        this.state.markers.forEach(marker => marker.remove());
        this.state.markers = [];
    },

    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance: function(point1, point2) {
        const R = 6371; // Earth's radius in kilometers
        const lat1 = point1[0] * Math.PI / 180;
        const lat2 = point2[0] * Math.PI / 180;
        const dLat = (point2[0] - point1[0]) * Math.PI / 180;
        const dLon = (point2[1] - point1[1]) * Math.PI / 180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    /**
     * Show error message to user
     */
    showError: function(message) {
        // You can implement this to show errors in your UI
        console.error(message);
    },

    /**
     * Export geological and measurement data to JSON file
     */
    exportData: function() {
        const data = {
            location: {
                lat: this.state.maps.topo.getCenter().lat,
                lng: this.state.maps.topo.getCenter().lng
            },
            geologicalUnits: this.state.selectedUnits,
            measurements: this.state.measurePoints.map(point => ({
                lat: point[0],
                lng: point[1]
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'geological-data.json';
        a.click();
        window.URL.revokeObjectURL(url);
    }

};

// Initialize when Google Maps API loads
function initMap() {
    if (window.google && window.google.maps) {
        GeoExplorer.initialize();
    }
}

// Backup initialization
document.addEventListener('DOMContentLoaded', () => {
    if (window.google && window.google.maps) {
        GeoExplorer.initialize();
    }
});
