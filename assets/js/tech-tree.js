'use strict';

var research = ['physics', 'society', 'engineering', 'anomaly'];

var config = {
    //container: '#tech-tree-',
    rootOrientation: 'WEST', // NORTH || EAST || WEST || SOUTH
    nodeAlign: 'TOP',
    hideRootNode: true,
    siblingSeparation: 20,
    subTeeSeparation:  20,
    scrollbar: 'resize',
    connectors: {
        type: 'step'
    },
    node: {
        HTMLclass: 'tech',
        collapsable: false
    },
    callback: {
        onTreeLoaded: function(tree) {
            init_tooltips();

            var area = tree.nodeHTMLclass.replace('tech', '').replace(' ', '');
            init_nodestatus(area);

            const observer = lozad();
            observer.observe();
		}
    }
};

function init_tooltips() {

    $('.node:not(.tooltipstered)').tooltipster({
        minWidth: 300,
        trigger: 'click',
        maxWidth: 512,
        functionInit: function(instance, helper){
            var content = $(helper.origin).find('.extra-data');
            $(content).find('img').each(function(img, el) {
                $(el).attr('src',$(el).attr('data-src'));
                
                var tech = $(el)[0].classList[$(el)[0].classList.length-1];
                if(!$('#' + tech).hasClass('anomaly')) {
                    var parent = $('#' + tech)[0];
                    if(parent !== undefined && parent.classList.length > 1)
                    $(el).addClass(parent.classList[2]);
                }
            });
            instance.content($('<div class="ui-tooltip">' + $(content).html() + '</div>'));
        },
        functionReady: function(instance, helper) {
            $(helper.tooltip).find('.tooltip-content').each(function(div){
                var content = $(this).html();
                content = content.replace(new RegExp(/£(\w+)£/,'g'), '<img class="resource" src="../assets/icons/$1.png" />');
                $(this).html(content);
            });
            $(helper.tooltip).find('.node-status').each(function() {
                var tech = $(this)[0].classList[1];
                if($('#' + tech).find('div.node-status').hasClass('active')) {
                    $(this).addClass('active');
                } else {
                    $(this).removeClass('active');
                }
            });
        }
    });
}

function setup(tech) {
    var techClass = (tech.is_dangerous ? ' dangerous' : '')
        + (!tech.is_dangerous && tech.is_rare ? ' rare' : '');

    var tmpl = $.templates("#node-template");
    var html = tmpl.render(tech);

    tech.HTMLid = tech.key;
    tech.HTMLclass = tech.area + techClass + (tech.is_start_tech ? ' active' : '');

    var output = html;
    if(tech.is_start_tech) {
        var e = $('<div>' + html + '</div>');
        e.find('div.node-status').addClass('active').addClass('status-loaded');
        output = e.html();
    }

    tech.innerHTML = output;

    $(tech.children).each(function(i, node) {
        setup(node);
    });
};

function setup_search() {
    const trees = document.querySelector('#tech-tree').querySelectorAll("[id|='tech-tree']");

    let nodes = Array.from(trees).filter((t) => {
        return t.getAttribute("class") == null || !t.getAttribute("class").includes("float-NoDisplay");
    }).reduce((a, b) => { a.push(...b.querySelectorAll('.node.tech')); return a; }, []);
    nodes = nodes.reduce((a, b) =>  {
        let the_text = '';
        b.querySelectorAll('.node-name, .extra-data .tooltip-content:not(.prerequisites)').forEach(data => {
            the_text += data.innerText;
            the_text += data.title;
        });
        a.push({ node: b, text: the_text });
        return a;
    }, []);

    const debounce = (callback, wait) => {
        let timeoutId = null;
        return (...args) => {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                callback.apply(null, args);
            }, wait);
        };
    };

    let current_idx = 0;
    current_idx = 0;
    let last_search_term = "";
    $("#deepsearch").on("change keyup paste", debounce(function () {
        const search_term = $('#deepsearch').val();
        if (search_term == last_search_term) {
            return;
        } else {
            last_search_term = search_term;
        }

        current_idx = 0;
        if (!search_term) {
            nodes.forEach(n => n.node.style.opacity = 1);
            return;
        }
        
        let hits = nodes.filter(n => {
            const match = n.text.toLowerCase().includes(search_term.toLowerCase());
            
            n.node.style.opacity = match ? 0.6 : 0.1;

            return match;
        });

        console.log(hits.length);


        hits.sort((a, b) => {
            return a.node.getBoundingClientRect().top - b.node.getBoundingClientRect().top || a.node.getBoundingClientRect().left - b.node.getBoundingClientRect().left;
        });

        let first_hit = true;

        hits.forEach(n => {
            if (first_hit) {
                first_hit = false;
                console.log(n.node);
                n.node.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "nearest",
                  });
                n.node.style.opacity = 1;
            } else {
                n.node.style.opacity = 0.6;
            }
        })

    }, 300));

    $("#deepsearch").on('keypress',function(e) {
        if(e.which == 13) {
            const search_term = $('#deepsearch').val();

            let hits = nodes.filter(n => {
                const match = n.text.toLowerCase().includes(search_term.toLowerCase());
                
                n.node.style.opacity = match ? 0.6 : 0.1;
    
                return match;
            });
    
    
            hits.sort((a, b) => {
                return a.node.getBoundingClientRect().top - b.node.getBoundingClientRect().top || a.node.getBoundingClientRect().left - b.node.getBoundingClientRect().left;
            });

            if (hits.length == 0) {
                return; 
            }

            hits[current_idx % hits.length].node.style.opacity = 0.6;
            let current_focused = hits[(current_idx + 1) % hits.length].node;
            current_focused.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });
            current_focused.style.opacity = 1;

            current_idx += 1;
        }
    });
};


$(document).ready(function() {
    load_tree();

    let checkExist = setInterval(() => {
        if (document.querySelector('#tech-tree')) {
           clearInterval(checkExist);
           setup_search();
        };
    }, 100)
});

function _load(jsonData, tree) {
    var container = '#tech-tree-' + jsonData.children[0].name;
    var myconfig = {container: container};
    $.extend(true, myconfig, config);

    charts[tree] = new Treant({chart:myconfig, nodeStructure: jsonData.children[0]}, function () {},$);
}

function load_tree() {
    research.forEach( area => {
        if('anomaly' !== area) {
            $.getJSON( area + '.json', function(jsonData) {
                setup(jsonData);
                _load(jsonData, area);
            });
        }
    });
        $.getJSON('anomalies.json', function(jsonData) {
        // Event techs don't really need a Tree
        $(jsonData).each(function(index, item) {
            setup(item);
            var e = $("<div>").html(item.innerHTML);
			e.find('.tech-controls').remove();
            e.attr("id", item.key);
            e.attr("class",item.HTMLclass)
            e.addClass("node").addClass("tech").addClass("anomaly");
            $('#tech-tree-anomalies').append(e);
        });

        // FIX: Bilder für Anomalien manuell laden (Lozad-Umgehung)
        $('#tech-tree-anomalies find img[data-src]').each(function() {
            var src = $(this).attr('data-src');
            if (src) {
                $(this).attr('src', src);
            }
        });

        init_nodestatus('anomalies');
        init_tooltips();
    });

    if(window.indexedDB) {
        initDB();
    }
    else if (window.localStorage) {
        setupLocalStorage();
    }
}
