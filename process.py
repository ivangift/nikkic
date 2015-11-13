# -*- coding: utf-8 -*- 
# Ivan's Workshop
import csv
PATH = 'raw'

evolve = 'evolve.csv'
convert = 'convert.csv'
merchant = 'merchant.csv'

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

writer = open('convert.js', 'w');
reader = csv.reader(open(PATH + "/" + convert))
writer.write("var convert = [\n")
for row in reader:
  target = compatibility(row[0])
  hint_target = row[1]
  source = compatibility(row[2])
  price = row[3]
  num = row[4]
  writer.write("  ['%s', '%s', '%s', '%s', '%s'],\n" % (target, hint_target, source, price, num))
writer.write("];")
writer.close()


writer = open('merchant.js', 'w');
reader = csv.reader(open(PATH + "/" + merchant))
writer.write("var merchant = [\n")
for row in reader:
  target = compatibility(row[0])
  hint_target = row[1]
  price = row[2]
  unit = row[3]
  writer.write("  ['%s', '%s', '%s', '%s'],\n" % (target, hint_target, price, unit))
writer.write("];")
writer.close()