// Add ability to track node status
var charts = {};

function init_nodestatus(area) {
    var $areaContainer = $('#tech-tree-' + area);

    // 1. UNSERE NEUEN STEUERUNGSELEMENTE BINDEN
    // Klick auf "o" (Ausgrauen)
    $areaContainer.on('click', '.btn-dim-tree', function(event) {
        event.stopPropagation(); // Verhindert das normale Tech-Klick-Event!
        var $node = $(this).closest('.node');
        var nodeHTMLid = $node.attr('id');
        
        // Prüfen, ob es schon gedimmt ist
        var isDimmed = $node.hasClass('tech-dimmed');
        toggleDimTech(area, nodeHTMLid, !isDimmed);
    });

    // Klick auf "x" (Verstecken)
    $areaContainer.on('click', '.btn-hide-tree', function(event) {
        event.stopPropagation(); // Verhindert das normale Tech-Klick-Event!
        var $node = $(this).closest('.node');
        var nodeHTMLid = $node.attr('id');
        
        // Wir nutzen eine Daten-Klasse am Eltern-Knoten, um den Status zu merken
        var areChildrenHidden = $node.hasClass('children-hidden');
        
        if (!areChildrenHidden) {
            $node.addClass('children-hidden');
            toggleHideChildren(area, nodeHTMLid, true);
        } else {
            $node.removeClass('children-hidden');
            toggleHideChildren(area, nodeHTMLid, false);
        }
    });


    // 2. DAS ORIGINAL-VERHALTEN (unverändert, nur mit Schutz für Anomalien!)
    $areaContainer.find('.node div.node-status:not(.status-loaded)').each(function() {
        var events = $._data($( this )[0], "events");

        if(undefined === events || undefined === events.click) {
            $(this).on('click', function toggle_status() {
                // Find chart for the research
                if($(this).parent().hasClass('anomaly')) {
                    if($(this).hasClass('active')) {
                        $(this).removeClass('active');
                        $(this).parent().removeClass('active');
                    } else {
                        $(this).addClass('active');
                        $(this).parent().addClass('active');
                    }

                    event.stopPropagation();
                    return;
                }
                
                // --- SCHUTZ FÜR ANOMALIEN ---
                // Anomalien haben keine Bäume und keine Eltern!
                if (area === 'anomalies') {
                    var id = $( this ).parent().attr('id');
                    if($(this).hasClass('active')) {
                        $(this).removeClass('active');
                        $(this).parent().removeClass('active');
                    } else {
                        $(this).addClass('active');
                        $(this).parent().addClass('active');
                    }
                    event.stopPropagation();
                    return;
                }
                // --- ENDE DES SCHUTZES ---

                // Limmit activation to research directly under an activated parent
                var parent_id = $(this).parent().data('treenode').parentId;
                if(undefined === parent_id) {
                    return;
                }
                // If the parent is the root node [0], this is the first research that can be activated
                if(0 < parent_id) {
                    var parent = charts[area].tree.nodeDB.db[parent_id];

                    if(!$( '#' + parent.nodeHTMLid + ' div.node-status').hasClass('active')) {
                        return;
                    }
                }
                // Check for any other prerequisites
                var active = true;
                $(this).parent().find('span.node-status').each(function() {
                    var tech = $(this)[0].classList[1];
                    tech = $('#' + tech).find('div.node-status');
                    if(undefined !== tech && !tech.hasClass('active')) {
                        active = false;
                    }
                });
                if(!active) return;

                var id = $( this ).parent().attr('id');
                if($(this).hasClass('active')) {
                    updateResearch(area, id, false);
                } else {
                    updateResearch(area, id, true);
                }
                event.stopPropagation();
            });
            $( this ).addClass('status-loaded');
        }
    });
    
    // Zähler beim ersten Laden der Seite einmalig berechnen
    updateTierCounters();

    // REINES KLICK-TEST-SKRIPT FÜR DAS MENÜ
    if (!$('.dlc-main-tab').data('bound-toggle')) {
        // Klick auf den DLC-Haupttab
        $('.dlc-main-tab > a').on('click', function(event) {
            event.preventDefault();
            event.stopPropagation(); // Verhindert, dass der Klick direkt wieder vom Dokument abgefangen wird
            
            var $menu = $('.dlc-dropdown-menu');
            
            // Toggle: Wenn sichtbar -> ausblenden, wenn unsichtbar -> einblenden
            if ($menu.is(':visible')) {
                $menu.fadeOut(150);
            } else {
                $menu.fadeIn(150);
            }
        });

        // Schließen, wenn man irgendwo anders auf der Seite hinklickt
        $(document).on('click', function(event) {
            if (!$(event.target).closest('.dlc-main-tab').length) {
                $('.dlc-dropdown-menu').fadeOut(150);
            }
        });

        $('.dlc-main-tab').data('bound-toggle', true);
    }
} // Hier endet init_nodestatus korrekt

function getNodeDBNode(area, name) {
    for(const item of charts[area].tree.nodeDB.db) {
        if(item.nodeHTMLid === name) return item;
    }
    for(const tree in charts) {
        if(tree === area) continue;
        for(const item of charts[tree].tree.nodeDB.db) {
            if(item.nodeHTMLid === name) return item;
        }
    }
    return null;
}

function updateResearch(area, name, active) {
    if($( '#' + name + ' div.node-status').hasClass('active') == active) {
        return;
    }

    var inode = getNodeDBNode(area, name);

    if(active) {
        $('#' + name).addClass('active');
        $('#' + name).find('.node-status').addClass('active');

        if(inode == null) return;

        var myConnector = $(inode.connector).get(0);
        if(myConnector !== undefined) $(myConnector).addClass("active");

        for(const child of inode.children) {
            $(charts[area].tree.nodeDB.db[child].connector[0]).addClass(area);
        }

    } else {
        $('#' + name).removeClass('active');
        $('#' + name).find('.node-status').removeClass('active');

        if(inode == null) return;

        for(const child of inode.children) {
            var child_node = charts[area].tree.nodeDB.db[child];
            $(child_node.connector[0]).removeClass(area);
            updateResearch(area, child_node.nodeHTMLid, false);
        }
    }
    
    // LIVE-ZÄHLER TRIGGER: Ruft die Zählung auf, sobald etwas geklickt wird!
    updateTierCounters();
}

function getInitNode(node, name) {
    for (const count in node) {
        if(name == node[count].key && undefined !== node[count].innerHTML) {
            return node[count];
        } else if(undefined !== node[count].children && 0 < node[count].children.length) {
            var childNode = getInitNode(node[count].children, name);

            if(undefined !== childNode) {
                return childNode;
            }
        }
    }
    return undefined;
}

// IndexedDB solution (Multiple research sets saved)
var offlineDB;

function initDB() {
    var request = window.indexedDB.open("researchDB");
    request.onerror = function(event) {
        alert('Unable to store more than one set of research unless permission is approved!');
        if(window.localStorage) {
            setupLocalStorage();
        }
    };
    request.onsuccess = function(event) {
        offlineDB = event.target.result;
        offlineDB.onerror = function(event) {
            console.error("IndexedDB error: " + event.target.errorCode);
        };
        offlineDB.onupgradeneeded = function(event) {
            offlineDB.onversionchange = function(event) {
                offlineDB.close();
            };
        };
        findLists();
    };
    request.onupgradeneeded = function(event) {
        event.currentTarget.result.createObjectStore("TreeStore", { keyPath: "name" });
    };
}

function findLists() {
    var objectStore = offlineDB.transaction("TreeStore").objectStore("TreeStore");

    var lists = [];
    objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            lists.push(cursor.value);
            cursor.continue();
        }
        else {
            lists.forEach(item => {
                $('#research_list').append('<option value="' + item.name + '">' + item.name + '</option>');
            });
            $('#research_save').on('click', function(event) {
                event.preventDefault();
                if($('#research_selection').val() && $.trim($('#research_selection').val()).length !== 0) {
                    saveListToIndexedDB( $('#research_selection').val() );
                } else {
                    saveListToIndexedDB("Default List");
                }
            });
            $('#research_load').on('click', function(event) {
                event.preventDefault();
                if($('#research_selection').val() && $.trim($('#research_selection').val()).length !== 0) {
                    loadListFromIndexedDB( $('#research_selection').val() );
                } else {
                    loadListFromIndexedDB("Default List");
                }
            });
            $('#research_remove').on('click', function(event) {
                event.preventDefault();
                if($('#research_selection').val() && $.trim($('#research_selection').val()).length !== 0) {
                    removeListFromIndexedDB( $('#research_selection').val() );
                }
            });
            $('.research').removeClass('hide');
        }
    };
}

function saveListToIndexedDB(name) {
    if(offlineDB) {
        var data = [];
        research.forEach(area => {
            $('.' + area + ' div.node-status.active').parent().not(':contains(\\(Starting\\))').each(function() {
                data.push({key: $(this).attr('id'), area: area});
            });
        });

        var objectStore = offlineDB.transaction(["TreeStore"], "readwrite").objectStore("TreeStore");

        var result = objectStore.put({name: name, data: data});
        result.onsuccess = function(event) {
            if(event.target.result && name == event.target.result) {
                alert('Research List: ' + name + ' was saved successfully!');
                return true;
            }
        };
    } else {
        initDB();
    }
}

function loadListFromIndexedDB(name) {
    if(offlineDB) {
        var objectStore = offlineDB.transaction("TreeStore").objectStore("TreeStore");

        var result = objectStore.get(name);
        result.onsuccess = function(event) {
            if(event.target.result && event.target.result.data) {
                var data = event.target.result.data;
                research.forEach(area => {
                    $('.' + area + ' div.node-status.active').parent().not(':contains(\\(Starting\\))').each(function() {
                        updateResearch(area, $(this).attr('id'), false);
                        $(this).find('div.node-status').removeClass('active');
                    });
                });
                data.forEach(item => {
                    if('anomaly' == item.area) {
                        $('#' + item.key).addClass('active');
                        $('#' + item.key).find('div.node-status').addClass('active');
                    }
                    else {
                        updateResearch(item.area, item.key, true);
                    }
                });
            }
            else {
                event.target.errorCode = `Research list "${name}" does not exist.`;
                result.onerror(event);
            }
        };
        result.onerror = function(event) {
            alert('Unable to load Research List: ' + name + '\nError: ' + event.target.errorCode);
        };
    } else {
        initDB();
    }
}

function removeListFromIndexedDB(name) {
    if(offlineDB) {
        var objectStore = offlineDB.transaction(["TreeStore"], "readwrite").objectStore("TreeStore");
        var result = objectStore.delete(name);
        result.onerror = function(event) {
            alert('Unable to delete Research List: ' + name + '\nError: ' + event.target.errorCode);
        };
        result.onsuccess = function(event) {
            $('option[value="' + name + '"]').remove();
            if($.trim($('#research_selection').val()) == name) {
                $('#research_selection').val('');
            }
        };
    } else {
        initDB();
    }
}

// LocalStorage solution (Single save)
function setupLocalStorage() {
    $('#research_save').on('click', function(event) {
        event.preventDefault();
        saveResearchToLocalStorage();
    }).parent().removeClass('hide');
    $('#research_load').on('click', function(event) {
        event.preventDefault();
        loadResearchFromLocalStorage();
    }).parent().removeClass('hide');
}

function saveResearchToLocalStorage() {
    var data = {};
    research.forEach(area => {
        var activeTech = [];
        $('.' + area + ' div.node-status.active').parent().not(':contains(\\(Starting\\))').each(function() {
            activeTech.push($(this).attr('id'));
        });
        data[area] = activeTech;
    });
    localStorage['LocalStorage'] = JSON.stringify(data);
}

function loadResearchFromLocalStorage() {
    if(localStorage['LocalStorage']) {
        var data = JSON.parse(localStorage['LocalStorage']);
        research.forEach(area => {
            var activeTech = data[area];
            activeTech.forEach(tech => updateResearch(area, tech, true));
            charts[area].tree.reload();
        });
    } else {
        alert("Unable to load data from local storage!");
    }
}

// Funktion 1: Ausgrauen (Dimmen) von Techs und deren Kindern
function toggleDimTech(area, nodeHTMLid, shouldDim) {
    var inode = getNodeDBNode(area, nodeHTMLid);
    if (!inode) return;

    var $el = $('#' + nodeHTMLid);

    if (shouldDim) {
        $el.addClass('tech-dimmed');
    } else {
        $el.removeClass('tech-dimmed');
    }

    for (const child of inode.children) {
        var child_node = charts[area].tree.nodeDB.db[child];
        toggleDimTech(area, child_node.nodeHTMLid, shouldDim);
    }
}

// Funktion 2: Komplettes Verstecken von Kindern und Verbindungslinien
function toggleHideChildren(area, nodeHTMLid, shouldHide) {
    var inode = getNodeDBNode(area, nodeHTMLid);
    if (!inode) return;

    var $parentEl = $('#' + nodeHTMLid);

    if (shouldHide) {
        $parentEl.addClass('tech-dimmed');
    } else {
        $parentEl.removeClass('tech-dimmed');
    }

    for (const child of inode.children) {
        var child_node = charts[area].tree.nodeDB.db[child];
        var $childEl = $('#' + child_node.nodeHTMLid);
        
        var myConnector = child_node.connector && child_node.connector[0];

        if (shouldHide) {
            $childEl.addClass('tech-hidden');
            if (myConnector) $(myConnector).addClass('tech-hidden');
        } else {
            $childEl.removeClass('tech-hidden');
            if (myConnector) $(myConnector).removeClass('tech-hidden');
        }

        toggleHideChildren(area, child_node.nodeHTMLid, shouldHide);
    }
}

// ==========================================
// Funktion 3: NEUER LIVE-TIER-ZÄHLER
// ==========================================
function updateTierCounters() {
    // Wir bereiten Zähler für alle 5 Tiers vor
    let tierCounts = {
        'physics':     { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        'society':     { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        'engineering': { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    // Gehe durch alle aktiven (grünen) Kacheln
    $('.node.active').each(function() {
        let $node = $(this);
        
        // 1. Hole die nackte Zahl aus dem Tier-Feld (z. B. "1", "2")
        let tierText = $node.find('.tier').text().replace('Tier', '').trim(); 
        let tierNumber = parseInt(tierText);
        
        // 2. Bestimme den Bereich anhand der CSS-Klassen aus dem Template
        let currentArea = '';
        if ($node.find('.physics-research').length > 0) currentArea = 'physics';
        else if ($node.find('.society-research').length > 0) currentArea = 'society';
        else if ($node.find('.engineering-research').length > 0) currentArea = 'engineering';

        // Wenn Bereich gefunden und das Tier eine gültige Zahl von 1-5 ist
        if (currentArea !== '' && tierNumber >= 1 && tierNumber <= 5) {
            tierCounts[currentArea][tierNumber]++;
        }
    });

    let areas = ['physics', 'society', 'engineering'];
    
    areas.forEach(area => {
        let currentTier = 1;
        
        // Stufen-Logik: Prüfen, ob die Hürde von 6 Forschungen genommen wurde
        for (let t = 1; t < 5; t++) {
            if (tierCounts[area][t] >= 6) {
                currentTier = t + 1;
            } else {
                break; // Sobald eine Stufe unter 6 ist, bleiben wir auf diesem Tier
            }
        }
        
        // Den Text für die Navigationsleiste zusammenbauen
        let countForDisplay = tierCounts[area][currentTier];
        let label = `Tier ${currentTier} (${countForDisplay}/6)`;
        
        // Spezialfall: Wenn man Tier 5 erreicht hat
        if (currentTier === 5) {
            label = `Tier 5 (${countForDisplay})`;
        }
        
        $(`#counter-${area}`).text(label);
    });
}
