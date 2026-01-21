/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3887478402")

  // remove field
  collection.fields.removeById("json3438747460")

  // remove field
  collection.fields.removeById("text433810847")

  // remove field
  collection.fields.removeById("text3704734368")

  // remove field
  collection.fields.removeById("number4054378915")

  // update field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "number2094210366",
    "max": null,
    "min": null,
    "name": "workDays",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "number988864939",
    "max": null,
    "min": null,
    "name": "periodsPerDay",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "json2097449105",
    "maxSize": 0,
    "name": "breaks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "json2655271985",
    "maxSize": 0,
    "name": "daySchedules",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3887478402")

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "json3438747460",
    "maxSize": 5000000,
    "name": "selectedDays",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text433810847",
    "max": 0,
    "min": 0,
    "name": "schoolStartDate",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3704734368",
    "max": 0,
    "min": 0,
    "name": "schoolStartTime",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "number4054378915",
    "max": 90,
    "min": 20,
    "name": "minutesPerPeriod",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "number2094210366",
    "max": 7,
    "min": 4,
    "name": "workDays",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "number988864939",
    "max": 15,
    "min": 2,
    "name": "periodsPerDay",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "json2097449105",
    "maxSize": 5000000,
    "name": "breaks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "json2655271985",
    "maxSize": 5000000,
    "name": "daySchedules",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
