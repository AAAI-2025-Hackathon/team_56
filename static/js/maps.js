const GeoExplorer = {
    initialized: false,
    
    state: {
        maps: {
            topo: null,
            geo: null
        },
        streetView: null,
        streetViewService: null,
        measurementMode: false,
        measurePoints: [],
        layers: {},
        controls: {},
        selectedUnits: [],
        markers: []
    },

    initialize: function() {
        if (this.initialized) {
            console.log('GeoExplorer already initialized');
            return;
        }

        // try {
        //     // Verify required libraries are loaded
        //     if (!window.googleMapsLibraries) {
        //         throw new Error('Google Maps libraries not loaded');
        //     }
        try {
            // Wait for Google Maps to be fully loaded
            if (!window.google || !window.google.maps) {
                console.log('Waiting for Google Maps to load...');
                setTimeout(() => this.initialize(), 100);
                return;
            }

            const defaultCenter = [39.8283, -98.5795];
            const defaultZoom = 4;

            // Initialize in correct order
            this.initializeStreetView();
            this.initializeTopoMap(defaultCenter, defaultZoom);
            this.initializeGeoMap(defaultCenter, defaultZoom);
            this.initializeTools();
            this.setupEventListeners();

            this.initialized = true;
            console.log('GeoExplorer initialized successfully');

        } catch (error) {
            console.error('Initialization error:', error);
            this.handleInitializationError(error);
        }
    },


    handleInitializationError: function(error) {
        // Add error handling for initialization failures
        const streetViewDiv = document.getElementById('street-view');
        if (streetViewDiv) {
            streetViewDiv.innerHTML = `
                <div class="no-streetview-message">
                    <p>Failed to initialize application</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    },

    initializeTopoMap: function(center, zoom) {
        // Create map with explicit CRS
        this.state.maps.topo = L.map('topo-map', {
            crs: L.CRS.EPSG3857
        }).setView(center, zoom);
        
        // Add OpenTopoMap as base layer
        this.state.layers.topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution: 'Map data: © OpenTopoMap contributors'
        }).addTo(this.state.maps.topo);

        // Add satellite layer
        this.state.layers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Imagery © Esri'
        });

        // Add layer control for topo map
        const baseLayers = {
            "Topographic": this.state.layers.topo,
            "Satellite": this.state.layers.satellite
        };
        L.control.layers(baseLayers).addTo(this.state.maps.topo);
    },

    

    initializeGeoMap: function(center, zoom) {
        // Create geological map with standard Web Mercator projection
        this.state.maps.geo = L.map('geo-map', {
            crs: L.CRS.EPSG3857
        }).setView(center, zoom);
        
        // Add OpenStreetMap as a faint base layer for geographic context
        this.state.layers.streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors',
            opacity: 0.3  // Keep base map subtle so geological features stand out
        }).addTo(this.state.maps.geo);
    
        // Add Macrostrat geological layer using the correct tile endpoint
        this.state.layers.geology = L.tileLayer('https://tiles.macrostrat.org/carto/{z}/{x}/{y}.png', {
            maxZoom: 18,
            tileSize: 256,
            attribution: '<a href="https://macrostrat.org/">Macrostrat</a>',
            opacity: 1.0,  // Slightly transparent to allow base map to show through
            // Add event handlers to help debug tile loading issues
            onTileLoad: function(tile) {
                console.log('Successfully loaded Macrostrat tile:', tile.src);
            },
            onTileError: function(tile) {
                console.error('Failed to load Macrostrat tile:', tile.src);
            }
        }).addTo(this.state.maps.geo);
    
        // Add layer controls to toggle between different views
        const overlayMaps = {
            "Geology": this.state.layers.geology,
            "Streets": this.state.layers.streets
        };
        
        // Create and add the layer control, allowing users to toggle layers
        if (!this.state.controls.layers) {
            this.state.controls.layers = L.control.layers(null, overlayMaps).addTo(this.state.maps.geo);
        }
    
        // Add scale control to help with distance measurements
        L.control.scale({
            imperial: false  // Use metric units only
        }).addTo(this.state.maps.geo);
    },

    initializeStreetView: function() {
        try {
            const streetViewDiv = document.getElementById('street-view');
            if (!streetViewDiv) {
                throw new Error('Street View container not found');
            }
    
            // Initialize Street View service
            this.state.streetViewService = new google.maps.StreetViewService();
    
            // Initialize panorama with default options
            this.state.streetView = new google.maps.StreetViewPanorama(streetViewDiv, {
                position: { lat: 39.8283, lng: -98.5795 }, // Default center of US
                pov: { heading: 0, pitch: 0 },
                zoom: 1,
                visible: true,
                fullscreenControl: true,
                linksControl: true,
                panControl: true,
                addressControl: true,
                enableCloseButton: false,
                motionTracking: false
            });
    
            // Link the map to the Street View panorama
            if (this.state.maps.topo) {
                this.state.maps.topo.setStreetView(this.state.streetView);
            }
    
            console.log('Street View initialized successfully');
    
        } catch (error) {
            console.error('Street View initialization error:', error);
            this.showStreetViewError(streetViewDiv, 'Failed to initialize Street View');
        }
    },
    
    handleMapClick: function(e) {
        const { lat, lng } = e.latlng;
    
        // Log the clicked coordinates
        console.log('Clicked coordinates:', lat, lng);
    
        // Update coordinate display
        document.getElementById('lat').textContent = lat.toFixed(6);
        document.getElementById('lng').textContent = lng.toFixed(6);
    
        // Handle measurement if in measurement mode
        if (this.state.measurementMode) {
            this.addMeasurementPoint(lat, lng);
            return;
        }
    
        // Update Street View
        if (this.state.streetViewService && this.state.streetView) {
            const searchOptions = {
                location: { lat: lat, lng: lng },
                radius: 5000, // Increase search radius to 5000 meters
                source: google.maps.StreetViewSource.DEFAULT
            };
    
            console.log('Searching for Street View panorama...');
    
            this.state.streetViewService.getPanorama(searchOptions)
                .then(data => {
                    console.log('Street View data found:', data);
    
                    // Check if we have valid data
                    if (!data || !data.location || !data.location.latLng) {
                        throw new Error('No Street View data available at this location');
                    }
    
                    const panorama = this.state.streetView;
    
                    // Set the position of the Street View panorama
                    panorama.setPosition(data.location.latLng);
    
                    // Set the point of view (heading and pitch)
                    panorama.setPov({
                        heading: google.maps.geometry.spherical.computeHeading(
                            data.location.latLng,
                            new google.maps.LatLng(lat, lng)
                        ),
                        pitch: 10 // Slight upward tilt
                    });
    
                    // Ensure the panorama is visible
                    panorama.setVisible(true);
    
                    // Add a marker at the clicked location
                    if (this.state.streetViewMarker) {
                        this.state.streetViewMarker.setMap(null); // Clear previous marker
                    }
    
                    this.state.streetViewMarker = new google.maps.Marker({
                        position: { lat: lat, lng: lng },
                        map: panorama,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 7,
                            fillColor: '#FF0000',
                            fillOpacity: 0.7,
                            strokeWeight: 1
                        }
                    });
    
                    // Remove any error messages
                    const streetViewDiv = document.getElementById('street-view');
                    streetViewDiv.classList.remove('error-state');
                })
                .catch(error => {
                    console.error('Street View error:', error);
    
                    // Show an error message if Street View is not available
                    const streetViewDiv = document.getElementById('street-view');
                    streetViewDiv.innerHTML = `
                        <div class="no-streetview-message">
                            <p>Street View is not available at this location</p>
                            <p>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                            <p>Try clicking closer to a road or populated area</p>
                        </div>
                    `;
                    streetViewDiv.classList.add('error-state');
                });
        }
    
        // Load geological data
        this.loadGeologicalData(lat, lng);
    },
    // Handle map clicks
//     handleMapClick: function(e) {
//         const {lat, lng} = e.latlng;
        
//         // Update coordinate display
//         document.getElementById('lat').textContent = lat.toFixed(6);
//         document.getElementById('lng').textContent = lng.toFixed(6);

//         // Handle measurement if in measurement mode
//         if (this.state.measurementMode) {
//             this.addMeasurementPoint(lat, lng);
//             return;
//         }

//         // Update Street View
//        if (this.state.streetViewService && this.state.streetView) {
//     const searchOptions = {
//         location: {lat: lat, lng: lng},
//         radius: 5000,
//         source: google.maps.StreetViewSource.DEFAULT
//     };

//     this.state.streetViewService.getPanorama(searchOptions)
//         .then(data => {
//                         // Check if we have valid data
//             if (!data || !data.location || !data.location.latLng) {
//                 throw new Error('No Street View data available at this location');
//             }

//             const panorama = this.state.streetView;
            
//             panorama.setPosition(data.location.latLng);
//             panorama.setPov({
//                 heading: google.maps.geometry.spherical.computeHeading(
//                     data.location.latLng,
//                     new google.maps.LatLng(lat, lng)
//                 ),
//                 pitch: 10
//             });
//             panorama.setVisible(true);

//             if (this.state.streetViewMarker) {
//                 this.state.streetViewMarker.setMap(null);
//             }
            
//             this.state.streetViewMarker = new google.maps.Marker({
//                 position: {lat: lat, lng: lng},
//                 map: panorama,
//                 icon: {
//                     path: google.maps.SymbolPath.CIRCLE,
//                     scale: 7,
//                     fillColor: '#FF0000',
//                     fillOpacity: 0.7,
//                     strokeWeight: 1
//                 }
//             });

//             const streetViewDiv = document.getElementById('street-view');
//             streetViewDiv.classList.remove('error-state');
//         })
//         .catch(error => {
//             console.log('Street View error:', error);
//             const streetViewDiv = document.getElementById('street-view');
//             streetViewDiv.innerHTML = `
//                 <div class="no-streetview-message">
//                     <p>Street View is not available at this location</p>
//                     <p>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
//                     <p>Try clicking closer to a road or populated area</p>
//                 </div>
//             `;
//             streetViewDiv.classList.add('error-state');
//         });
// }

//         // Load geological data
//         this.loadGeologicalData(lat, lng);
//     },



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

    setupEventListeners: function() {
        // Map click handlers
        this.state.maps.topo.on('click', (e) => {
            console.log('Topo map clicked'); // Log to confirm the event is firing
            this.handleMapClick(e);
        });
        this.state.maps.geo.on('click', (e) => {
            console.log('Geo map clicked'); // Log to confirm the event is firing
            this.handleMapClick(e);
        });
    
        // Map synchronization
        this.setupMapSync();
    },

    setupEventListeners: function() {
        // Map click handlers
        this.state.maps.topo.on('click', (e) => this.handleMapClick(e));
        this.state.maps.geo.on('click', (e) => this.handleMapClick(e));

        // Map synchronization
        this.setupMapSync();
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
                    // Add this method to your code to display the description
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
    
            // Now let's try to get a Street View of this location
            this.updateStreetView(lat, lng);
    
        } catch (error) {
            console.error('Error loading geological data:', error);
            this.showError('Failed to load geological data. Please try again.');
        }
    },
    
    // Add this method to display the LLM-generated description
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
    
    
    // Enhanced display function to show our comprehensive geological information
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
    
        const contentDiv = infoDiv.querySelector('.geology-content');
    
        // Display basic rock unit information first
        if (data.basic.success && data.basic.success.data?.length > 0) {
            const basicInfo = document.createElement('div');
            basicInfo.className = 'geo-tab-content active';
            basicInfo.dataset.tab = 'basic';
    
            data.basic.success.data.forEach(unit => {
                const unitDiv = document.createElement('div');
                unitDiv.className = 'geology-card';
                unitDiv.innerHTML = `
                    <h3>${unit.name || 'Geological Unit'}</h3>
                    <div class="unit-details">
                        <p><strong>Age:</strong> ${unit.t_age} to ${unit.b_age} million years ago</p>
                        <p><strong>Rock Types:</strong> ${unit.lith || 'Not specified'}</p>
                        <p><strong>Environment:</strong> ${unit.environ || 'Not specified'}</p>
                        ${data.legend.success ? `
                            <div class="unit-legend" style="background-color: ${data.legend.success[unit.source_id]?.color || '#ccc'}"></div>
                        ` : ''}
                    </div>
                `;
                basicInfo.appendChild(unitDiv);
            });
            
            contentDiv.appendChild(basicInfo);
        }
    
        // Add fossil information if available
        if (data.fossils.success && data.fossils.success.data?.length > 0) {
            const fossilInfo = document.createElement('div');
            fossilInfo.className = 'geo-tab-content';
            fossilInfo.dataset.tab = 'fossils';
            
            const fossilList = data.fossils.success.data.map(fossil => `
                <div class="fossil-card">
                    <h4>${fossil.name}</h4>
                    <p><strong>Age:</strong> ${fossil.early_age} to ${fossil.late_age} Ma</p>
                    <p><strong>Environment:</strong> ${fossil.environment || 'Not specified'}</p>
                </div>
            `).join('');
            
            fossilInfo.innerHTML = fossilList || '<p>No fossil data available for this location.</p>';
            contentDiv.appendChild(fossilInfo);
        }
    
        // Add event listeners for tab navigation
        const tabs = infoDiv.querySelectorAll('.geo-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show corresponding content
                const tabContents = contentDiv.querySelectorAll('.geo-tab-content');
                tabContents.forEach(content => {
                    content.classList.toggle('active', content.dataset.tab === tab.dataset.tab);
                });
            });
        });
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
    

    /**
     * Display LLM-generated detailed description
     */
    displayDetailedDescription: function(description) {
        // Configuration for description length and quality
        const maxDescriptionLength = 2000;  // Maximum length for descriptions
        const minSentenceLength = 100;      // Minimum length to ensure substantial content
        
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
        
        // Ensure the description ends with a complete sentence
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
    //  * Update Street View display for a location
    //  */
    // updateStreetView: function(lat, lng) {
    //     console.log('Attempting to update Street View for:', lat, lng);
        
    //     // Verify our services are initialized
    //     if (!this.state.streetViewService || !this.state.streetView) {
    //         console.error('Street View services not initialized');
    //         return;
    //     }
    
    //     // Search for panoramas with expanded options
    //     this.state.streetViewService.getPanorama({
    //         location: { lat: lat, lng: lng },
    //         radius: 100,  // Search within 100 meters
    //         source: google.maps.StreetViewSource.DEFAULT,
    //         preference: google.maps.StreetViewPreference.NEAREST
    //     }).then(data => {
    //         console.log('Found Street View panorama:', data);
            
    //         // Update the panorama with the found location
    //         const panoramaLocation = data.location.latLng;
            
    //         // Calculate heading to look towards clicked point
    //         const heading = google.maps.geometry.spherical.computeHeading(
    //             panoramaLocation,
    //             new google.maps.LatLng(lat, lng)
    //         );
    
    //         // Update the view with smooth transitions
    //         this.state.streetView.setOptions({
    //             position: panoramaLocation,
    //             pov: {
    //                 heading: heading,
    //                 pitch: 10
    //             },
    //             zoom: 1,
    //             visible: true
    //         });
    
    //     }).catch(error => {
    //         console.log('Street View not available:', error);
            
    //         // Show a user-friendly message
    //         const streetViewDiv = document.getElementById('street-view');
    //         streetViewDiv.innerHTML = `
    //             <div class="no-streetview-message">
    //                 <h3>Street View Not Available</h3>
    //                 <p>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
    //                 <p>Street View imagery isn't available at this location. This might be because:</p>
    //                 <ul>
    //                     <li>The location is too far from mapped roads</li>
    //                     <li>The area hasn't been captured by Street View cameras</li>
    //                     <li>Privacy restrictions in this area</li>
    //                 </ul>
    //                 <p>Try clicking closer to a road or in a more populated area.</p>
    //             </div>
    //         `;
    //     });
    // },

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


// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    GeoExplorer.initialize();
});
