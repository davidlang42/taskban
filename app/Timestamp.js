//source: http://cbas.pandion.im/2009/10/generating-rfc-3339-timestamps-in.html

/*
 Internet Timestamp Generator
 Copyright (c) 2009 Sebastiaan Deckers
 License: GNU General Public License version 3 or later
*/

function pad(amount, width) {
  var padding = "";
  while (padding.length < width - 1 && amount < Math.pow(10, width - padding.length - 1))
   padding += "0";
  return padding + amount.toString();
 }

function timestamp(date) {
 date = date ? date : new Date();
 var offset = date.getTimezoneOffset();
 return pad(date.getFullYear(), 4)
   + "-" + pad(date.getMonth() + 1, 2)
   + "-" + pad(date.getDate(), 2)
   + "T" + pad(date.getHours(), 2)
   + ":" + pad(date.getMinutes(), 2)
   + ":" + pad(date.getSeconds(), 2)
   + "." + pad(date.getMilliseconds(), 3)
   + (offset > 0 ? "-" : "+")
   + pad(Math.floor(Math.abs(offset) / 60), 2)
   + ":" + pad(Math.abs(offset) % 60, 2);
}