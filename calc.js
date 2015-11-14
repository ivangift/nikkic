// calc.js
var cost = {
  '1': {evolve: 1200, pattern: 800},
  '2': {evolve: 2400, pattern: 1200},
  '3': {evolve: 4000, pattern: 2000},
  '4': {evolve: 7000, pattern: 4000},
  '5': {evolve: 12000, pattern: 8000},
  '6': {evolve: 20000, pattern: 20000},
};

Resource = function(category, id, number) {
  return {
    category: category,
    id: id,
    inventory: 0,
    number: number,
    cost: 0,
    unit: 'N/A',
    keep: true,
    deps: {},
    source: {},
    require: {},
    addDeps: function(node, num, require) {
      this.deps[node.category + node.id] = node;
      node.source[this.category + this.id] = num;
      node.require[this.category + this.id] = require;
    },
    getNumber: function() {
      var n = 0;
      var require = false;
      for (var x in this.source) {
        n += this.source[x];
        require |= this.require[x];
      }
      return require ? n + (this.keep ? 1 : 0) : 0;
    }
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
    ret[targetCate][targetId].push(Resource(sourceCate, sourceId, num));
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
    ret[targetCate][targetId] = Resource(sourceCate, sourceId, num);
  }
  return ret;
}();

var convertSet = function() {
  ret = {}
  for (var i in convert) {
    var targetCate = convert[i][0];
    var targetId = convert[i][1];
    var source = convert[i][2];
    var price = convert[i][3];
    var num = convert[i][4];
    if (!ret[targetCate]) {
      ret[targetCate] = {};
    }
    ret[targetCate][targetId] = {source: source, price: price, num: num};
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
    + "<th>获取成本</th>"
    + "</tr></thead>";
}

function calcNum(numParent, num, keep) {
  if (numParent == 0) return 0; // after all, you don't need any deps if goal is already fulfilled
  var kept = keep ? 1 : 0;
  return numParent * (num - kept) + kept;
}

function createOrUpdate(category, id, keep) {
  if (!resourceSet[category]) {
    resourceSet[category] = {};
  }
  if (!resourceSet[category][id]) {
    resourceSet[category][id] = Resource(category, id); 
  }
  resourceSet[category][id].keep &= keep;
  return resourceSet[category][id];
}

function deps(parent) {
  var category = parent.category;
  var id = parent.id;
  var num = Math.max(parent.getNumber() - parent.inventory, 0);
  var c = clothesSet[category][id];

  if (patternSet[category] && patternSet[category][id]) {
    parent.cost = num * cost[c.stars].pattern;
    parent.unit = '金币';
    for (var i in patternSet[category][id]) {
      var source = patternSet[category][id][i];
      var reqNum = calcNum(num, source.number - 1); // real number
      var child = createOrUpdate(source.category, source.id, true /* keep last */);
      parent.addDeps(child, reqNum, num > 0);
      deps(child);
    }
  }
  var evol = parseSource(c.source, '进');
  if (evol && clothesSet[c.type.mainType][evol]) {
    parent.cost = num * cost[clothesSet[c.type.mainType][evol].stars].evolve;
    parent.unit = '金币';
    var x = evolveSet[c.type.mainType][id].number;
    var reqNum = calcNum(num, x - 1); // real number
    var child = createOrUpdate(c.type.mainType, evol, true /* keep last */);
    parent.addDeps(child, reqNum, num > 0);
    deps(child);
  }
  var remake = parseSource(c.source, '定');
  if (remake && clothesSet[c.type.mainType][remake]) {
    parent.cost = num * convertSet[category][id].num * convertSet[category][id].price;
    parent.unit = '星光币';
    var reqNum = calcNum(num, 1);
    var child = createOrUpdate(c.type.mainType, remake, false /* don't keep */);
    parent.addDeps(child, reqNum, num > 0);
    deps(child);
  }
  if (c.price) {
    parent.cost = c.price * num;
    parent.unit = c.unit;
  }
  if (c.source.indexOf('公') > 0) {
    parent.cost = num * 18; // on average 1 out of 3
    parent.unit = "体力";
  }
  var sources = c.source.split("/");
  var limited = 0;
  for (var i in sources) {
    if (sources[i].indexOf('公') > 0) {
      limited ++;
    }
    if (sources[i].indexOf('少') > 0) {
      parent.cost = num * 20; // on average 1 out of 5
      parent.unit = "体力";
      limited = -1; // no limit
      break;
    }
  }
}

var root;
var resourceSet = {};
function drawTable(category, id) {
  var ret = thead();
  root = Resource(category, id);
  root.source['request'] = 1;
  root.require['request'] = true;
  root.keep = 0;
  $("#table").html("<table id='table'>"+ ret+"<tbody></tbody></table>");
  deps(root);
  summary(root);
  for (var i in root.deps) {
    render(root.deps[i], 0);
  }
}

function loadMerchant() {
  for (var i in merchant) {
    var category = merchant[i][0];
    var id = merchant[i][1];
    var price = merchant[i][2];
    var unit = merchant[i][3];
    if (clothesSet[category][id]) {
      clothesSet[category][id].price = price;
      clothesSet[category][id].unit = unit;
    }
  }
}

function init() {
  var category = url("#category");
  var pattern = url("#pattern");
  calcDependencies();
  loadMerchant();
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

function render(node, layer) {
  var number = Math.max(node.getNumber() - node.inventory, 0);
  var cost = node.cost == 0 ? '-' : (node.cost + node.unit);
  var c = clothesSet[node.category][node.id];
  var name = c.name;
  for (var i = 0; i < layer; i ++) {
    name = "&nbsp;&nbsp;" + name;
  }
  if ($("." + node.category + node.id).length < Object.keys(node.source).length) {
    var tr = $("<tr class='" + node.category + node.id +"'>");
    tr.append("<td>" + name + "</td>"
      + "<td>" + node.category + "</td>"
      + "<td>" + node.id + "</td>"
      + "<td>" + c.source + "</td>");
    var input = $("<input type='textbox' size=5 value='" + node.inventory + "'/>");
    tr.append($("<td class='inventory'>").append(input));
    tr.append("<td class='number'>" + number + "</td>"
      + "<td class='cost'>" + cost + "</td>");
    $("#table tbody").append(tr);

    input.change(function() {
      var num = parseInt($(this).val());
      if (!num) {
        num = 0;
      }
      $(this).val(num);
      updateInventory(node.category, node.id, num);
    });
  } else {
    $("." + node.category + node.id + " .number").text(number);
    $("." + node.category + node.id + " .cost").text(cost);
    $("." + node.category + node.id + " .inventory input").val(node.inventory);
  }
  for (var i in node.deps) {
    render(node.deps[i], layer+1);
  }
}

function updateInventory(category, id, value) {
  resourceSet[category][id].inventory = value;
  deps(resourceSet[category][id]);
  summary(root);
  for (var i in root.deps) {
    render(root.deps[i], 0);
  }
}

function visit(node, collector) {
  collector[node.category + node.id] = node;
  for (var v in node.deps) {
    visit(node.deps[v], collector);
  }
}

function summary(node) {
  var collector = {};
  visit(node, collector);
  var sum = {};
  for (var i in collector) {
    if (collector[i].cost > 0) {
      if (!sum[collector[i].unit]) {
        sum[collector[i].unit] = 0;
      }
      sum[collector[i].unit] += collector[i].cost;
    }
  }
  var ret = "";
  for (var unit in sum) {
    ret = ret + unit + ": " + sum[unit] + "<br/>";
  }
  $("#summary").html(ret);
}

$(document).ready(function() {
  init()
});
