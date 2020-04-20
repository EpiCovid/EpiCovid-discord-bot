'use strict'

const Discord = require('discord.js');
const fetch = require('node-fetch');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

/**
 * Split a string every n-th character into an array
 * @param {String} input 
 * @param {Number} n 
 */
function split_n(input, n) {
  var result = [];
  while (input.length) {
    result.push(input.substr(0, n));
    input = input.substr(n);
  }
  return result;
}

/**
 * Add an offset of empty spaces to str
 * @param {String} str 
 * @param {Number} offset 
 */
function add_offset(str, offset) {
  for (var i = 0; i != offset; i++)
    str += " "
  return str
}

/**
 * Parses arguments
 * See get_usage()
 */
class Options {
  constructor(args) {
    this._usage = false
    this._summary = false
    this._confirmed = false
    this._deaths = false
    this._recovered = false
    this._date = null
    this._error = null
    this._arg = null
    this._count = 10
    this._fn = {
      "help": this.help,
      "summary": this.summary,
      "confirmed": this.confirmed,
      "deaths": this.deaths,
      "recovered": this.recovered,
      "country": this.country,
      "count": this.count
    }
    for (var i = 1; i != args.length; i++) {
      if ((args[i].split('=')).length == 2) {
        this._arg = args[i].split('=')[1]
        args[i] = args[i].split('=')[0]
      }
      try {
        (this._fn[args[i]])(this);
      } catch {
        this._usage = true;
        this._error = "Undefined argument : " + args[i];
      }
    }
  }
  get_usage() {
    var msg = ``
    this._error ? msg += this._error + `\n` : msg += `\n`
    msg += `Usage : !covid [OPTIONS]
List information about the Covid-19 pandemic

  summary                 list a summary of the pandemic [DEFAULT]
  confirmed               list confirmed cases
  deaths                  list deaths cases
  recovered               list recovered casses
  country=[COUNTRY NAME]  list the required information of the given country
  count=[COUNT]           number of record to display, Default=10`
    return msg
  }
  help(obj) {
    obj._usage = true
  }
  summary(obj) {
    obj._summary = true
  }
  confirmed(obj) {
    obj._confirmed = true
  }
  deaths(obj) {
    obj._deaths = true
  }
  recovered(obj) {
    obj._recovered = true
  }
  country(obj) {
    if (obj._arg == null) {
      obj._error = "country: missing argument"
      obj._arg = null
      return
    }
    obj._country = obj._arg
    obj._arg = null
  }
  count(obj) {
    if (obj._arg == null) {
      obj._error = "count: missing argument"
      obj._arg = null
      return
    }
    obj._count = obj._arg
    obj._arg = null
  }
}

var url = require("url");

/**
 * Help create and format ùessage reponse based on the Option class
 */
class Response {
  constructor(opt) {
    this._opt = opt
  }
  async data() {
    // Check for error / usage
    if (this._opt._usage || this._opt._error)
      return this._opt.get_usage()

    // Set Where clause
    var where = "Confirmed > 0"
    if (this._opt._country)
      where += " AND Country_Region='" + this._opt._country + "'"

    // set ouFields clause
    var outFields = ["Country_Region", "Province_State"]
    if (this._opt._confirmed)
      outFields.push("Confirmed")
    if (this._opt._deaths)
      outFields.push("Deaths")
    if (this._opt._recovered)
      outFields.push("Recovered")
    if (outFields.length == 2)
      outFields.push("Confirmed", "Deaths", "Recovered")

    // Creating query data
    var payload = {
      f: "json",
      where: where,
      returnGeometry: "false",
      outFields: outFields.join(','),
      orderByFields: "Confirmed desc",
      returnZ: false,
      returnM: false,
      resultRecordCount: this._opt._count,
    };
    var query = url.format({ query: payload });
    var baseUrl = "https://services1.arcgis.com//0MSEUqKaxRlEPj5g/ArcGIS/rest/services/Coronavirus_2019_nCoV_Cases/FeatureServer/1/query"
    const response = await fetch(baseUrl + query);
    const data = await response.json()
    if (data.error) {
      return data.error.message
    }
    var formated_data = this.get_formated_data(data)
    var splitted_msg = split_n(formated_data, 1000)
    return splitted_msg[0];
  }
  get_formated_data(data) {
    var fields = data["fields"];
    var fields_on = [];
    for (var i in fields) {
      if (fields[i].name == "OBJECTID")
        continue
      fields_on.push({
        name: fields[i].name,
        data: [],
        offset: String(fields[i].name).length,
      })
    }
    var features = data["features"]
    for (var i in features) {
      var attributes = features[i]["attributes"]
      for (var j in fields_on) {
        var field_name = fields_on[j].name
        fields_on[j].data.push(attributes[field_name])
        fields_on[j].offset < String(attributes[field_name]).length ? fields_on[j].offset = String(attributes[field_name]).length : null
      }
    }

    var data_string = ""

    const base_offset = 3
    // Fist line with fields
    for (var i in fields_on) {
      data_string += fields_on[i].name;
      var off_len = fields_on[i].offset - String(fields_on[i].name).length
      data_string = add_offset(data_string, off_len ? base_offset + off_len : base_offset)
    }
    data_string += "\n"
    // All data
    var data_len = fields_on[0].data.length
    var field_len = fields_on.length
    for (var i = 0; i != data_len; i++) {
      for (var j = 0; j != field_len; j++) {
        data_string += fields_on[j].data[i]
        data_string = add_offset(data_string, fields_on[j].offset - String(fields_on[j].data[i]).length + base_offset)
      }
      data_string += "\n"
    }
    return data_string
  }
}

client.on('message', async function (msg) {
  if (msg.content.split(' ')[0] != "!covid")
    return;
  var opt = new Options(msg.content.split(' '))
  var response = new Response(opt)
  const message = await response.data()
  msg.reply("```" + message + "```")
});

const discord_token = process.env.DISCORD_TOKEN
client.login(discord_token);