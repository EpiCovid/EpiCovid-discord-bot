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
 * Parses arguments
 * See get_usage()
 */
class Options {
  constructor(args) {
    this._usage = false
    this._error = null
    this._fn = {
      "-h": this.help,
      "--help": this.help
    }
    for (var i = 1; i != args.length; i++) {
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
    msg += `Usage : ./covid`
    return msg
  }
  help(obj) {
    obj._usage = true;
  }
}

/**
 * Help create and format ùessage reponse based on the Option class
 */
class Response {
  constructor(opt) {
    this._opt = opt
  }
  async data() {
    if (this._opt._usage)
      return this._opt.get_usage()
    const response = await fetch("https://services1.arcgis.com//0MSEUqKaxRlEPj5g/ArcGIS/rest/services/Coronavirus_2019_nCoV_Cases/FeatureServer/1/query?f=json&where=Confirmed+%3E+0&returnGeometry=false&outFields=*&orderByFields=Confirmed+desc&resultRecordCount=1000")
    const data = await response.json()
    var formated_data = this.get_formated_data(data)
    var splitted_msg = split_n(formated_data, 1000)
    return "```" + splitted_msg[0] + "```"
    for (var i = 0; i != splitted_msg.length; i++) {
      msg.reply("```" + splitted_msg[0] + "```");
    }
  }
  get_formated_data(data) {
    var fields = data["fields"];
    var fields_on = [];
    for (var i = 0; i != fields.length; i++) {
      fields_on.push(fields[i].name);
    }
    var features = data["features"]
    var data_string = ""
    for (var i = 0; i != features.length; i++) {
      for (var j = 0; j != fields_on.length; j++) {
        data_string += fields_on[j] + " : " + features[i]["attributes"][fields_on[j]] + "\n"
      }
      data_string += "\n";
    }
    return data_string
  }
}

client.on('message', async function (msg) {
  if (msg.content.split(' ')[0] != "./covid")
    return;
  var opt = new Options(msg.content.split(' '))
  var response = new Response(opt)
  const message = await response.data()
  msg.reply(message)
});

const discord_token = process.env.DISCORD_TOKEN
client.login(discord_token);