
// Express - Logger - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

/**
 * Module dependencies.
 */
 
var sys = require('sys')



    //sprintf = require('ext').sprintf,
    //printf = require('ext').printf

/**
 * stdout buffering for performance
 */    
    
var buf = [],
    timer,
    // how long to wait once idle before writing the buf to stdout
    delay = 1000,
    // how many logs to buffer before writing buf to stdout
    threshold = 20,
    //out = process.stdout.write,
    write = function() {
      if (!buf.length) return
      process.stdout.write(buf.join("\n"))
      buf = []
    }

/**
 * Log formats
 */
 
var formats = {
  common: function(event, start) {
    printf('%s - - [%s] "%s %s HTTP/%d.%d" %s %d %0.3f',
      event.request.socket.remoteAddress,
      (new Date).format('%d/%b/%Y %H:%M:%S'),
      event.request.method.uppercase,
      event.request.url.pathname || '/',
      event.request.httpVersionMajor,
      event.request.httpVersionMinor,
      event.request.response.status,
      event.request.response.headers['content-length'] || 0,
      (Date.now() - start) / 1000)
  },
  combined: function(event, start) {
    formats.common(event, start)
    printf(' "%s" "%s"', 
      event.request.headers['referrer'] || event.request.headers['referer'] || '-',
      event.request.headers['user-agent'])
  },
  request: function(event, start) {
    var headers = event.request.headers.map(function(val, key){ return key + ': ' + val })
    printf('\n\n\n%s %s HTTP/%d.%d\n%s\n\n%s',
      event.request.method,
      event.request.url.href,
      event.request.httpVersionMajor,
      event.request.httpVersionMinor,
      headers.join('\n'),
      event.request.body)
  },
  plot: function(event, start) {
    sys.print(Date.now() - start)
  },
  buffer: (function(){ 
    var b = [],
        timer,
        write = function(){
          process.stdout.write(b.join("\n"))
          b = []
        }
        
    return function(event, start) { 
      clearTimeout(timer)
      b[b.length] = 
      sprintf('%s - - [%s] "%s %s HTTP/%d.%d" %s %d %0.3f',
        event.request.socket.remoteAddress,
        (new Date).format('%d/%b/%Y %H:%M:%S'),
        event.request.method.uppercase,
        event.request.url.pathname || '/',
        event.request.httpVersionMajor,
        event.request.httpVersionMinor,
        event.request.response.status,
        event.request.response.headers['content-length'] || 0,
        (Date.now() - start) / 1000)
        +
        sprintf(' "%s" "%s"', 
          event.request.headers['referrer'] || event.request.headers['referer'] || '-',
          event.request.headers['user-agent'])
      if (b.length > 1000) write();
      timer = setTimeout(function(){
        if (b.length) write()
      }, 1000)
    }
  })(),
  buffer2: function(event, start) { 
    buf[buf.length] = 
    [
      event.request.socket.remoteAddress,
      '-',
      '-',
      '[' + (new Date).format('%d/%b/%Y %H:%M:%S') + ']',
      [
        '"',
        event.request.method.uppercase,
        " ",
        event.request.url.pathname || '/',
        " HTTP/",
        event.request.httpVersionMajor,
        ".",
        event.request.httpVersionMinor,
        '"'
      ].join(''),
      event.request.response.status,
      event.request.response.headers['content-length'] || 0,
      (Date.now() - start) / 1000,
      '"' + (event.request.headers['referrer'] || event.request.headers['referer'] || '-') + '"',
      '"' + event.request.headers['user-agent'] + '"'
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
      formats[exports.Logger.format || 'common'](event, this.start || Date.now())
      if (buf.length > threshold) write(); 
      timer = setTimeout(write, delay)
      //sys.print('\n')
    }
  }
})