
// Express - Logger - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

/**
 * Module dependencies.
 */
 
var sys = require('sys')


/**
 * stdout buffering for performance
 */    
    
var timer,
    buf = []


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
     *   - threshold    number of logs to buffer before writing
     *   - delay        milliseconds of idletime to wait before writing buffer
     *
     * @param  {hash} options
     * @api private
     */

    init: function(options) {
      this.merge(options || {})
      this.threshold = this.hasOwnProperty('threshold') ? this.threshold : 20
      this.delay = this.hasOwnProperty('delay') ? this.delay : 1000
      Express.addListener('uncaughtException', this.write)
      process.addListener('exit', this.write)
      process.addListener('SIGINT', function(){
        exports.Logger.write()
        process.exit(0)
      })
    },
    
    write: function() {
      if (!buf.length) return
      process.stdout.write(buf.join('\n')+'\n')
      buf = []
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
      if (buf.length > exports.Logger.threshold) exports.Logger.write(); 
      timer = setTimeout(exports.Logger.write, exports.Logger.delay)
    }
  }
})