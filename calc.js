// calc.js
var princess_rate = 3; // 3 out of 1

var cost = {
  '1': {evolve: 1200, pattern: 800},
  '2': {evolve: 2400, pattern: 1200},
  '3': {evolve: 4000, pattern: 2000},
  '4': {evolve: 7000, pattern: 4000},
  '5': {evolve: 12000, pattern: 8000},
  '6': {evolve: 20000, pattern: 20000},
};

var generate = {
  '金币': 96574,
  '星光币': 45,
  '体力': 475,
  '水晶鞋': 1
};

var CATEGORIES = [
  '发型',
  '连衣裙',
  '外套',
  '上装',
  '下装',
  '袜子',
  '鞋子',
  '饰品',
  '妆容'
];

var palette = [
  ["#ff9999", "#ffb3b3", "#ffcccc", "#ffe5e5"],
  ["#ff99ff", "#ffb3ff", "#ffccff", "#ffe5ff"],
  ["#9999ff", "#b3b3ff", "#ccccff", "#e5e5ff"],
  ["#ffe599", "#ffecb3", "#fff2cc", "#fff9e5"]
];

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
  for (var i in CATEGORIES) {
    var category = CATEGORIES[i];
    var option = document.createElement('option');
    option.text = category;
    option.value = category;
    dropdown.add(option);
  }
  changeCategory();
}

function byName(a, b) {
  return a.name.localeCompare(b.name);
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
  toSort = [];
  for (var i in patternSet[category]) {
    if (!clothesSet[category][i]) continue;
    toSort.push(clothesSet[category][i]);
  }
  toSort.sort(byName);
  for (var i in toSort) {
    var option = document.createElement('option');
    option.text = toSort[i].name;
    option.value = toSort[i].id;
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
    parent.cost = num * 6 * princess_rate; // on average 1 out of 3
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
  if (limited > 0) {
    parent.limit = num * princess_rate / limited / 3;
  }
  if (!parent.cost || parent.cost == 0) {
    if (c.source.indexOf("迷") >= 0 || c.source.indexOf("幻") >= 0) {
      parent.luck = 1;
    } else if (c.source.indexOf("成就") >= 0) {
      parent.effort = 1;
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
  resourceSet = {};
  deps(root);
  summary(root);
  var theme = 0;
  for (var i in root.deps) {
    render(root.deps[i], theme++, 0);
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
  if (url().indexOf("ivangift") > 0) {
    $(".announcement").append("在玉人的英(wei)明(bi)领(li)导(you)下总算做好了.");
  }
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

function render(node, theme, layer) {
  var number = Math.max(node.getNumber() - node.inventory, 0);
  var cost = node.cost == 0 ? '-' : (node.cost + node.unit);
  if (node.limit) {
    cost += "/" + node.limit + "天";
  }
  var c = clothesSet[node.category][node.id];
  var name = c.name;
  if (layer > 0) {
    name = "&nbsp;&#x025B9;" + name;
  }
  for (var i = 0; i < layer-1; i ++) {
    name = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + name;
  }
  var color;
  if (layer >= palette[theme].length) {
    color = palette[theme][palette[theme].length - 1];
  } else {
    color = palette[theme][layer];
  }
  if ($("." + node.category + node.id).length < Object.keys(node.source).length) {
    var tr = $("<tr class='" + node.category + node.id + "'>");
    tr.append("<td style='background: " + color + "'>" + name + "</td>"
      + "<td style='background: " + color + "'>" + node.category + "</td>"
      + "<td style='background: " + color + "'>" + node.id + "</td>"
      + "<td style='background: " + color + "'>" + c.source + "</td>");
    var input = $("<input type='textbox' size=5 value='" + node.inventory + "'/>");
    tr.append($("<td style='background: " + color + "' class='inventory'>").append(input));
    tr.append("<td style='background: " + color + "' class='number'>" + number + "</td>"
      + "<td style='background: " + color + "' class='cost'>" + cost + "</td>");
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
    render(node.deps[i], theme, layer+1);
  }
}

function updateInventory(category, id, value) {
  resourceSet[category][id].inventory = value;
  deps(resourceSet[category][id]);
  summary(root);
  var theme = 0;
  for (var i in root.deps) {
    render(root.deps[i], theme++, 0);
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
      if (collector[i].limit) {
        if (!sum['公主关次数限制']) {
          sum['公主关次数限制'] = 0;
        }
        if (sum['公主关次数限制'] < collector[i].limit) {
          sum['公主关次数限制'] = collector[i].limit;
        }
      }
    }
    if (collector[i].luck) {
      sum['一些运气'] = '许多';
    }
    if (collector[i].effort) {
      sum['一些努力'] = '总有一';
    }
  }
  var ret = "<table>";
  for (var unit in sum) {
    if (unit in generate) {
      var days = Math.ceil(sum[unit] / generate[unit]);
      ret += "<tr><td>" + unit + ": " + $.number(sum[unit]) + "</td><td>" + days + "天</td></tr>";
    } else {
      ret += "<tr><td>" + unit + "</td><td>" + sum[unit] + "天</td></tr>";
    }
    
  }
  ret += "</table>";
  $("#summary").html(ret);
}

$(document).ready(function() {
  init()
});
