var STRUCTURES_URL = "structures.json";
var DOWNSAMPLE = 4;

var SECTION_IMAGE_ID = 112364351;

var _structures = {};

var width = 800,
    height = 2000,
    vPadding = 200;

var x = d3.scale.linear()
    .domain([0, width])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, height - vPadding])
    .range([0, height - vPadding]);

var color = d3.scale.category20();

var svg = d3.select("#icicle").append("svg")
    .attr("width", width)
    .attr("height", height);


var partition = d3.layout.partition()
    .size([width, height - vPadding])
    .value(function(d) { return d.size; });

var rect = svg.selectAll(".node");

var line = d3.svg.line()
    .interpolate("bundle")
    .tension(.85)
    .x( function(d) { return x(d.x); })
    .y( function(d) { return y(d.y); });

var paths = {};

var addWeightAndPaths = function(root, structures, paths) {
  root.weight = structures[root.id].weight;
  if (paths[root.id] != null) {
    console.log('found non-null!' + paths[root.id][0] + "\n" + paths[root.id][1] );
    root.path = paths[root.id][0];
    root.path_parent = paths[root.id][1];
  }
  else {
    root.path = null;
    root.path_parent = null;
  }
  var children = root.children;
  if (children.length == 0) {
    root.size = root.weight;
  }
  else {
    for (var i = 0; i < children.length; i++) {
      addWeightAndPaths(children[i], structures, paths);
    }
  }
}

// Helper function for dealing with the weirdness of xml. Find the first
// child of elem "n" that is of type "element".
// Adapted from: http://www.w3schools.com/dom/prop_element_firstchild.asp
var get_firstchild = function (n) {
  localfirstchild = n.firstChild;
  while (localfirstchild.nodeType != 1) {
    localfirstchild = localfirstchild.nextSibling;
  }
  return localfirstchild;
}


// Load all of the lsices.
var loadSlices = function(on_success) {
  d3.json("slices.json", function (filenames) {
    d3.select("#brain").append("svg").attr("id", "brain_svg").attr("width", "600")
        .attr("height", 900)
        .append("g").attr("transform","scale(0.010625)")
        .attr("id", "svg_container");
    var i, j;
    for (i = 0; i < filenames.length; i++) {
      d3.xml("svgslices/" + filenames[i], "images/svg+xml", function (xml) {
        var brain_svg = document.getElementById("svg_container");
        xml_elem = get_firstchild(get_firstchild(xml.documentElement));
        brain_svg.appendChild(xml_elem);
        xml_elem.setAttribute("visibility", "hidden");
        xml_elem.setAttribute("class", "slice_svg");
      });
    }
  });
  if ($("#278094964") != null) {
    on_success();
  }
}

var main = function() {    
    d3.json(STRUCTURES_URL, function(response) {
    for (var i = 0; i < response.msg.length; i++) {
      var s = response.msg[i];
      _structures[s.id] = s;
    }
    
    d3.selectAll("path")
      .attr("title", function (d) {
         return _structures[d3.select(this).attr("structure_id")].name;
      });
 
    d3.selectAll(".slice_svg").attr("id", function() { return "p" + d3.select(this).attr("id"); });
    d3.selectAll("path").attr("id", function () { return 'p' + d3.select(this).attr("id"); })[0]
      .forEach(function (d) {
        var structure_id = d.attributes.structure_id.value,
          path_id = d.id,
          parent_id = "p" + d.attributes.parent_id.value;
        paths[structure_id] = [path_id, parent_id];
      });

    d3.json("allen.json", function(error, root) {
      
      addWeightAndPaths(root, _structures, paths);
      var nodes = partition.nodes(root);

      var svg_color;
      rect = rect
          .data(nodes)
        .enter().append("rect")
          .attr("class", "node")
          .attr("x", function(d) { return x(d.x); })
          .attr("y", function(d) { return y(d.y); })
          .attr("width", function(d) { return x(d.dx); })
          .attr("height", function(d) { return y(d.dy); })
          .style("fill", function(d) { return '#' + d.color_hex_triplet; })
          .each(function (d) {
            if (d.children == null) {
              var targets = d.targets;
              if (targets != null) {
                targets = targets.map(function (d) { return nodedict[d]; });
                createPath(d, targets);
              }
            };
          })
          .on("click", clicked)
          .on("mouseover", function (d) {
            d3.selectAll(".slice_svg").attr("visibility", "hidden");
            console.log("#" + d.path_parent);
            d3.select("#" + d.path)
              .attr("style", function (d) { svg_color = d3.select(this).attr("style"); console.log(svg_color); return "stroke:black;fill:red"; });
            d3.select("#" + d.path_parent).attr("visibility", "visible");
          }.on("mouseover", function (d) {
            d3.select("#" + d.path)
              .attr("style", function (d) { console.log(svg_color); return svg_color; })
          });

      svg.selectAll(".label")
          .data(nodes)
        .enter().append("text")
          .attr("class", "label")
          .attr("dy", ".35em")
          .attr("transform", function(d) { return "translate(" + x(d.x + d.dx / 2) + "," + y(d.y + d.dy / 2) + ")rotate(90)"; })
          .text(function(d) {
            if (x(d.dx) > 6) {
              return d.name; 
            }
            return '';
          });

    });
  });
}



loadSlices(main);


function clicked(d) {
  x.domain( [d.x, d.x + d.dx] );
  y.domain( [d.y, height - vPadding -d.dy]).range([d.y ? 20 : 0, height]);

  rect.transition()
      .duration(750)
      .attr("x", function(d) { return x(d.x); })
      .attr("y", function(d) { return y(d.y); })
      .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
      .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });

  svg.selectAll(".label")
      .transition(750)
      .duration(750)
      .attr("transform", function(d) { return "translate(" + x(d.x + d.dx / 2) + "," + y(d.y + d.dy / 2) + ")rotate(90)"; })
      .text(function (d) {
        if (x(d.x + d.dx) - x(d.x) > 6) {
          return d.name;
        }
        return '';
      });

}

var createPath = function (source, dests) {

  path = []
  for (var i = 0; i < dests.length; i++) {
    dest = dests[i];
    if (dest == null) {
      console.log('found endefined target. continueing.');
      continue;
    }
    // Path origin coordinates.
    var startx = x(source.x + source.dx / 2);
    var starty = y(source.y + source.dy);

    // Path distination coordinates
    var endx =   x(dest.x + dest.dx / 2);
    var endy = y(dest.y + dest.dy);

    // Create path coordinates.
    path.push([{ x: startx, y: starty },
        {x: startx, y: starty * 2},
        {x: endx, y: starty * 2},
        {x: endx, y: endy}]);
  };

  svg.selectAll(".link")
      .data(path)
    .enter().append("path")
      .attr("class", "link")
      .attr("d", line);
};
