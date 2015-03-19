var STRUCTURES_URL = "structures.json";
var DOWNSAMPLE = 4;

var SECTION_IMAGE_ID = 112364351;

var width = 800,
    height = 1000,
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

var addSizes = function(root) {
  var children = root.children;
  if (children.length == 0) {
    root.size = 1;
  }
  else {
    for (var i = 0; i < children.length; i++) {
      addSizes(children[i]);
    }
  }
}

var structBFS = function(root, myid) {
    var children = root.children;
    if (children != null) {
      for (var i = 0; i < children.length; i++) {
        if (children[i].id== myid) return root;
        structBFS(children[i], myid);
      }
    }
}





// Helper function for dealing with the weirdness of xml. Find the first
// child of elem "n" that is of type "element".
// Adapted from: http://www.w3schools.com/dom/prop_element_firstchild.asp
var get_firstchild = function (n) {
  var localfirstchild = n.firstChild;
  while (localfirstchild.nodeType != 1) {
    localfirstchild = localfirstchild.nextSibling;
  }
  return localfirstchild;
}

var xml_elem;

// Load all of the slices.
d3.json("slices_rep.json", function (filenames) {
    d3.select("#brain").append("svg").attr("id", "brain_svg").attr("width", "370")
        .attr("height", 470)

    for (var i = 0; i < filenames.length; i++) {
      d3.xml("svgslices/" + filenames[i], "images/svg+xml", function (xml) {
        var brain_svg = document.getElementById("brain_svg");
        xml_elem = get_firstchild(xml.documentElement);
        brain_svg.appendChild(xml_elem);
        get_firstchild(xml_elem).attributes.id.value
        xml_elem.setAttribute("id","p" + get_firstchild(xml_elem).attributes.id.value);
        xml_elem.setAttribute("visibility", "hidden");
        xml_elem.setAttribute("class", "slice_svg");
        xml_elem.setAttribute("transform", "scale(0.004625)");

        var slice_paths = d3.select(xml_elem)[0];

      });
    }
});
var debug;

d3.json("allen.json", function(error, root) {

    addSizes(root);
    var nodes = partition.nodes(root);

    var highlightPath = function (struct_id, color) {
      var d3_path = d3.select("path[structure_id=" +"'" + struct_id + "'" + "]" );
      var path_elem = d3_path[0][0];

      if (path_elem != null) {
        d3_path.style("fill", function (data) { return color; })
        path_elem.parentElement.parentElement.attributes.visibility.value = "visible";
        return true;
      }
      else {
        return false;
      }
    }

    rect = rect
        .data(nodes)
      .enter().append("rect")
        .attr("class", "node")
        .attr("id", function(d) { return d.id; })
        .attr("y", function(d) { return x(d.x); })
        .attr("x", function(d) { return y(d.y); })
        .attr("height", function(d) { return x(d.dx); })
        .attr("width", function(d) { return y(d.dy); })
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
          var was_found = highlightPath(d.id, "red");
        })
        .on("mouseout", function (d) {
          var was_found = highlightPath(d.id, d.color_hex_triplet);
        });


    svg.selectAll(".label")
        .data(nodes)
      .enter().append("text")
        .attr("class", "label")
        .attr("dy", ".35em")
        .attr("transform", function(d) { return "translate(" + y(d.y) + "," + x(d.x + d.dx / 2) + ")"; })
        .text(function(d) {
          if (x(d.dx) > 10) {
            return d.name; 
          }
          return '';
        });

});


function clicked(d) {
  x.domain( [d.x, d.x + d.dx] );
  y.domain( [d.y, height - vPadding -d.dy]).range([d.y ? 20 : 0, height]);

  rect.transition()
      .duration(750)
      .attr("y", function(d) { return x(d.x); })
      .attr("x", function(d) { return y(d.y); })
      .attr("height", function(d) { return x(d.x + d.dx) - x(d.x); })
      .attr("width", function(d) { return y(d.y + d.dy) - y(d.y); });

  svg.selectAll(".label")
      .transition(750)
      .duration(750)
      .attr("transform", function(d) { return "translate(" + y(d.y + d.dy / 2) + "," + x(d.x + d.dx / 2) + ")"; })
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
