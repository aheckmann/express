
// Express - Logger - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

/**
 * Module dependencies.
 */
 
var sys = require('sys')


/**
 * stdout buffering for performance
 */    
    
var buf = [],
    timer,
    // how long to wait once idle before writing the buf to stdout
    delay = 1000,
    // how many logs to buffer before writing buf to stdout
    threshold = 20,
    // writes to sdtout
    write = function() {
      if (!buf.length) return
      process.stdout.write(buf.join("\n")+"\n")
      buf = []
    }


/**
 * Log formats
 */
 
var formats = {
  common: function(request, start) {
    buf[buf.length] = 
      [
        request.socket.remoteAddress,
        '-',
        '-',
        '[' + (new Date).format('%d/%b/%Y %H:%M:%S') + ']',
        [
          '"',
          request.method,
          " ",
          request.url.pathname || '/',
          " HTTP/",
          request.httpVersionMajor,
          ".",
          request.httpVersionMinor,
          '"'
        ].join(''),
        request.response.status,
        request.response.headers['content-length'] || 0,
        (Date.now() - start) / 1000
      ].join(' ')
  },
  request: function(request, start) { 
    var key,
        headers = [],
        hdrs = request.headers
    for (key in hdrs) if (hdrs.hasOwnProperty(key)) {
      headers[headers.length] = key + ': ' + hdrs[key]
    }
    buf[buf.length] = 
      '\n\n\n' + 
      request.method + 
      ' ' +
      request.url.href + 
      ' HTTP/' + 
      request.httpVersionMajor + 
      '.' + 
      request.httpVersionMinor +
      '\n' + 
      headers.join('\n') +
      '\n\n' + 
      request.body
  },
  plot: function(event, start) {
    buf[buf.length] = (Date.now() - start)
  },
  combined: function(request, start) {
    buf[buf.length] = 
      [
        request.socket.remoteAddress,
        '-', '-',
        '[' + (new Date).format('%d/%b/%Y %H:%M:%S') + ']',
        [
          '"',
          request.method,
          " ",
          request.url.pathname || '/',
          " HTTP/",
          request.httpVersionMajor,
          ".",
          request.httpVersionMinor,
          '"'
        ].join(''),
        request.response.status,
        request.response.headers['content-length'] || 0,
        (Date.now() - start) / 1000,
        '"' + (request.headers['referrer'] || request.headers['referer'] || '-') + '"',
        '"' + request.headers['user-agent'] + '"'
      ].join(' ')  
  }
  
}

// --- Logger

exports.Logger = Plugin.extend({ 
  extend: {
    
    /**
     * Initialize logger options.
     *
     * Options:
     *
     *   - format
     *       'common'   outputs log in CommonLog format (DEFAULT)
     *       'combined' outputs log in Apache Combined format
     *       'request'  outputs the HTTP request for debugging
     *       'plot'     outputs request duration in milliseconds only
     *
     * @param  {hash} options
     * @api private
     */

    init: function(options) {
      this.merge(options || {})
    }
  },
  
  on: {
    
    /**
     * Start timer.
     */
    
    request: function(event) {
      this.start = Date.now()
    },
    
    /**
     * Output log data.
     */
    
    response: function(event) {
      clearTimeout(timer)
      formats[exports.Logger.format || 'common'](event.request, this.start || Date.now())
      if (buf.length > threshold) write(); 
      timer = setTimeout(write, delay)
    }
  }
})