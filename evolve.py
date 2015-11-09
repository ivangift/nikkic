# -*- coding: utf-8 -*- 
# Ivan's Workshop
import csv
PATH = 'raw'

evolve = 'evolve.csv'

def compatibility(name):
  if name == '上衣':
    return '上装'
  return name

reader = csv.reader(open(PATH + "/" + evolve))
reader.next()
writer = open('evolve.js', 'w');
writer.write("var evolve = [\n")
for row in reader:
  target = compatibility(row[0])
  hint_target = row[1]
  source = compatibility(row[2])
  hint_source = row[3]
  num = row[4]
  writer.write("  ['%s', '%s', '%s', '%s', '%s'],\n" % (target, hint_target, source, hint_source, num))
writer.write("];")
writer.close()