const moment = require("moment");
require("moment-timezone");
const zones = require("./zones.json");
var fs = require("fs");
var uZones = JSON.parse(fs.readFileSync("./user-zones.json"));

printErr = (msg, cmd) => {
  usage = "Usage: ";
  switch (cmd) {
    case "convert":
      usage +=
        "**!convert {zone} {new zone} {time} [±day]**. \nFor a list of supported time zones, enter **!zones**.";
      break;
    case "from":
      usage +=
        "**!from {zone} {time}**. \nFor a list of supported time zones, enter **!zones**.";
      break;
    case "to":
      usage +=
        "**!to {zone} {time}**. \nFor a list of supported time zones, enter **!zones**.";
      break;
    case "time":
      usage += "**!time [user/zone].**";
      break;
  }
  msg.channel.send(usage);
};

module.exports = {
  // !convert {zone} {zone} {time} [±day]
  convert: function(msg, args) {
    // wrong arguments
    if (args.length < 4) {
      printErr(msg, args[0]);
      return;
    }

    // append 'am' if not specified
    if (!args[3].match(/.*(am|pm)/i)) args[3] += "AM";
    // ensure time given is valid
    if (!/^\d{1,2}:\d{2}(am|pm)$/i.test(args[3])) {
      printErr(msg, args[0]);
      return;
    }

    // special case: users are mentioned instead of zone
    if (args[2].match(/^<@!?\d+>$/)) {
      var at = msg.mentions;
      if (at.users.size > 2) printErr(msg, args[0]);
      var usr = args[1].match(/^<@!?\d+>$/)
        ? at.users.last()
        : at.users.first();
      args[2] = uZones[usr.id] || null;
      // case: user has not set time zone
      if (!args[2]) {
        msg.channel.send(
          `At least one specified user has not set a preferred time zone.`
        );
        return;
      }
    }
    if (args[1].match(/^<@!?\d+>$/)) {
      var at = msg.mentions;
      if (at.users.size > 2) printErr(msg, args[0]);
      var usr = at.users.first();
      args[1] = uZones[usr.id] || null;
      // case: user has not set time zone
      if (!args[1]) {
        msg.channel.send(
          `At least one specified user has not set a preferred time zone.`
        );
        return;
      }
    }

    var time = args[3].split(":");

    args[1] = args[1].toUpperCase();
    args[2] = args[2].toUpperCase();

    // if time zones don't exist (or aren't supported)
    if (!zones.hasOwnProperty(args[1]) || !zones.hasOwnProperty(args[2])) {
      printErr(msg, args[0]);
      return;
    }

    // get time in local time zone
    hour = parseInt(time[0]);
    minute = parseInt(time[1].substring(0, 2));
    isPM = time[1].substring(2).toUpperCase() === "PM";
    addDay = 0;

    if (isPM && hour != 12) hour += 12;
    else if (!isPM && hour === 12) hour = 0;

    if (hour > 24 || minute >= 60 || (hour >= 24 && minute > 0)) {
      printErr(msg, args[0]);
      return;
    }

    // change day if provided
    if (args.length >= 5) {
      if (args[4] === "yesterday") {
        addDay = -1;
      } else if (args[4] === "tomorrow") {
        addDay = 1;
      } else if (args[4] === "today") {
        addDay = 0;
      } else {
        if (!/^[-+]?\d+$/.test(args[4])) {
          printErr(msg, args[0]);
          return;
        }
        addDay = parseInt(args[4]);
      }
    }

    var date = moment()
      .add(addDay, "days")
      .tz(zones[args[1]].region);
    date.set({ hour: hour, minute: minute });

    var date2 = date.clone().tz(zones[args[2]].region);

    msg.channel.send(
      `${date.format("MMM Do | hh:mmA")} ${args[1]} = \n${date2.format(
        "MMM Do | hh:mmA"
      )} ${args[2]}`
    );
  },

  // convert from given time zone to user's default
  // !from {zone} {time}
  convertFrom: function(msg, args) {
    // error case: user has not set default time zone
    if (!uZones.hasOwnProperty(msg.author.id)) {
      msg.reply("you have not set a default time zone.");
      return;
    }
    // convert current time is one isn't specified
    if (args.length === 2) {
      var time = moment();
      if (msg.mentions.users.size !== 0) {
        if (msg.mentions.everyone) {
          msg.channel.send("No.");
          return;
        } else if (!uZones.hasOwnProperty(msg.mentions.users.first().id)) {
          msg.channel.send(
            "At least one specified user has not set a preferred time zone."
          );
          return;
        }
        time = moment().tz(zones[uZones[msg.mentions.users.first().id]].region);
      }
      newArgs = [
        args[0],
        args[1],
        uZones[msg.author.id],
        time.format("hh:mmA")
      ];

      this.convert(msg, newArgs);
      return;
    }
    // check for proper input
    if (args.length < 3 || args.length > 4) {
      printErr(msg, args[0]);
      return;
    }

    // create args to send to convert
    newArgs = [args[0], args[1], uZones[msg.author.id], args[2]];
    if (args.length === 4) {
      newArgs.push(args[3]);
    }
    this.convert(msg, newArgs);
  },

  // convert from user's default time zone to zone given
  // !to {zone} {time}
  convertTo: function(msg, args) {
    // error case: user has not set default time zone
    if (!uZones.hasOwnProperty(msg.author.id)) {
      msg.reply("you have not set a default time zone.");
      return;
    }

    // convert current time is one isn't specified
    if (args.length === 2) {
      var time = moment().tz(zones[uZones[msg.author.id]].region);
      newArgs = [
        args[0],
        uZones[msg.author.id],
        args[1],
        time.format("hh:mmA")
      ];
      console.log(newArgs);
      this.convert(msg, newArgs);
      return;
    }
    // check for proper input
    if (args.length < 3 || args.length > 4) {
      printErr(msg, args[0]);
      return;
    }

    // create args to send to convert
    newArgs = [args[0], uZones[msg.author.id], args[1], args[2]];
    if (args.length === 4) {
      newArgs.push(args[3]);
    }
    this.convert(msg, newArgs);
  },

  // gets a user's time zone
  getZone: function(msg) {
    if (uZones.hasOwnProperty(msg.author.id)) {
      return uZones[msg.author.id];
    } else {
      return "";
    }
  },

  // sets a user's default time zone
  setZone: function(msg, args) {
    // no argument case: return user's time zone
    if (args.length === 1) {
      zone = this.getZone(msg);
      if (zone) {
        var time = moment().tz(zones[uZones[msg.author.id]].region);
        msg.reply(
          `your default time zone is ${zone}. \nIt is currently ${time.format(
            "hh:mmA"
          )}.`
        );
      } else {
        msg.reply("you have not set a default time zone.");
      }
    }
    // error case: return error message
    if (args.length !== 2) {
      msg.channel.send("Usage: **!default {zone}**");
      return;
    }

    args[1] = args[1].toUpperCase();

    // no time zone case: display message.
    if (!zones.hasOwnProperty(args[1])) {
      msg.channel.send(
        `Time zone \"${args[1]}\" not supported. \nFor a list of supported time zones, enter **!zones**.`
      );
      return;
    }

    // set user's default zones
    uZones[msg.author.id] = args[1];

    fs.writeFile("./user-zones.json", JSON.stringify(uZones), err => {
      if (err) {
        console.log(err);
      } else {
        let repMsg = `your time zone has been set to ${args[1]}.`;
        if (/^[CEMP]ST$/i.test(args[1])) {
          repMsg += `\n**Note:** This time zone does not factor in Daylight Savings Day. For the equivalent time zone with DST, set your time zone to ${args[1][0]}DT.`;
        }
        msg.reply(repMsg);
      }
    });
  },

  // displays current time for self or another user
  displayTime: function(msg, args, client) {
    if (args.length > 2) {
      // error case: invalid argument count
      printErr(msg, args[0]);
      return;
    } else if (args.length === 1) {
      // one argument case: display own time
      var userZone = uZones[msg.author.id] || null;
      if (!userZone) {
        msg.reply("you have not set a default time zone.");
      }
      var time = moment().tz(zones[userZone].region);

      msg.channel.send(`${time.format("MMM Do | hh:mmA")} ${userZone}`);
    } else {
      // two argument case: display another user's time
      var at = msg.mentions;

      if (at.users.size === 0) {
        if (args.length !== 2) {
          printErr(msg, arg[0]);
        } else {
          this.printTime(msg, args[1]);
        }
        return;
      }
      if (at.everyone) {
        msg.channel.send("No.");
        return;
      }
      var user = at.users.first();

      if (user.id === client.user.id) {
        msg.channel.send("I am timeless!");
      } else if (!uZones[user.tag]) {
        msg.channel.send(`${user.tag} has not set a default time zone.`);
      } else {
        var time = moment().tz(zones[uZones[user.tag]].region);
        msg.channel.send(
          `${time.format("MMM Do | hh:mmA")} ${uZones[user.tag]}.`
        );
      }
    }
  },

  printTime: function(msg, zone) {
    zone = zone.toUpperCase();
    args = msg.content.split(" ");
    if (!zones.hasOwnProperty(zone)) {
      if (args[1][0] === "@") {
        msg.channel.send(`${args[1]} is not a user in this server.`);
        return;
      }
      msg.channel.send(
        `"${zone}" is not a supported time zone. \nFor a list of supported time zones, enter **!zones**.`
      );
      return;
    }

    var time = moment().tz(zones[zone].region);
    msg.channel.send(`${time.format("MMM Do | hh:mmA z")}`);
  },

  // lists the supported time zones
  listZones: function(msg) {
    var zonelst = "";
    for (var key in zones) {
      if (zonelst) zonelst += ", ";
      zonelst += key;
    }

    msg.channel.send("Supported timezones: " + zonelst);
  }
};
