// calc.js

Resource = function(category, id, number, layer) {
  return {
    category: category,
    id: id,
    number: number,
    layer: layer
  }
}

var patternSet = function() {
  ret = {}
  for (var i in pattern) {
    var targetCate = pattern[i][0];
    var targetId = pattern[i][1];
    var sourceCate = pattern[i][2];
    var sourceId = pattern[i][3];
    var num = pattern[i][4];
    if (!ret[targetCate]) {
      ret[targetCate] = {};
    }
    if (!ret[targetCate][targetId]) {
      ret[targetCate][targetId] = [];
    }
    ret[targetCate][targetId].push(Resource(sourceCate, sourceId, num, 0));
  }
  return ret;
}();

var evolveSet = function() {
  ret = {}
  for (var i in evolve) {
    var targetCate = evolve[i][0];
    var targetId = evolve[i][1];
    var sourceCate = evolve[i][2];
    var sourceId = evolve[i][3];
    var num = evolve[i][4];
    if (!ret[targetCate]) {
      ret[targetCate] = {};
    }
    ret[targetCate][targetId] = Resource(sourceCate, sourceId, num, 0);
  }
  return ret;
}();

function drawCategory() {
  var dropdown = $("#category")[0];
  for (var category in patternSet) {
    var option = document.createElement('option');
    option.text = category;
    option.value = category;
    dropdown.add(option);
  }
  changeCategory();
}

function changeCategory() {
  var category = $("#category").val();
  $("#pattern").find('option').remove();
  var dropdown = $("#pattern")[0];
  var option = document.createElement('option');
  option.text = "选一件衣服";
  option.selected = true;
  option.disabled = "disabled";
  option.hidden = "hidden";
  dropdown.add(option);
  for (var i in patternSet[category]) {
    if (!clothesSet[category][i]) continue;
    var option = document.createElement('option');
    option.text = clothesSet[category][i].name;
    option.value = i;
    dropdown.add(option);
  }
  updateParam();
}

function selectPattern() {
  var category = $("#category").val();
  var id = $("#pattern").val();
  drawTable(category, id);
  updateParam();
}

function thead() {
  return "<thead><tr>"
    + "<th>名称</th>"
    + "<th>分类</th>"
    + "<th>编号</th>"
    + "<th>来源</th>"
    + "<th>拥有数量</th>"
    + "<th>需求数量</th>"
    + "</tr></thead>";
}

function calcNum(numParent, num) {
  return numParent * (num-1) + 1;
}

function deps(category, id, num, layer) {
  var ret = [];
  var c = clothesSet[category][id];

  if (patternSet[category] && patternSet[category][id]) {
    for (var i in patternSet[category][id]) {
      var source = patternSet[category][id][i];
      var reqNum = calcNum(num, source.number)
      ret.push(Resource(source.category, source.id, reqNum, layer + 1));
      ret = ret.concat(deps(source.category, source.id, reqNum, layer + 1));
    }
  }
  var evol = parseSource(c.source, '进');
  if (evol && clothesSet[c.type.mainType][evol]) {
    var x = evolveSet[c.type.mainType][id].number;
    var reqNum = calcNum(num, x);
    ret.push(Resource(c.type.mainType, evol, reqNum, layer + 1));
    ret = ret.concat(deps(c.type.mainType, evol, reqNum, layer + 1));
  }
  var remake = parseSource(c.source, '定');
  if (remake && clothesSet[c.type.mainType][remake]) {
    var reqNum = calcNum(num, 1);
    ret.push(Resource(c.type.mainType, remake, reqNum, layer + 1));
    ret = ret.concat(deps(c.type.mainType, remake, reqNum, layer + 1));
  }
  return ret;
}

function row(resource) {
  var c = clothesSet[resource.category][resource.id];
  var name = c.name;
  for (var i = 0; i < resource.layer; i ++) {
    name = "&nbsp;&nbsp;" + name;
  }
  return "<tr>"
      + "<td>" + name + "</td>"
      + "<td>" + resource.category + "</td>"
      + "<td>" + resource.id + "</td>"
      + "<td>" + c.source + "</td>"
      + "<td>" + "--TBD-- " + "</td>"
      + "<td>" + resource.number + "</td>"
      + "</tr>";
}

function tbody(resources) {
  var ret = "";
  for (var i in resources) {
    ret += row(resources[i]);
  }
  return "<tbody>" + ret + "</tbody>";
}

function drawTable(category, id) {
  var ret = thead();
  ret = ret + tbody(deps(category, id, 1, 0));
  $("#table").html("<table>" + ret + "</table>");
}

function init() {
  var category = url("#category");
  var pattern = url("#pattern");
  calcDependencies();
  drawCategory();
  if (patternSet[category]) {
    $("#category").val(category);
    changeCategory();
    if (patternSet[category][pattern]) {
      $("#pattern").val(pattern);
      selectPattern();
    }
  }
}

function updateParam() {
  var category = $("#category").val();
  var pattern = $("#pattern").val();
  var param = "category="+category + "&pattern=" + pattern;
  window.location.href = "#" + param;
}

$(document).ready(function() {
  init()
});
