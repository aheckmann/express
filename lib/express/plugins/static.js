
// Express - Static - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

/**
 * Module dependencies.
 */

var Request = require('express/request').Request,
    path = require('path'),
    fs = require('fs')
    
// --- File

exports.File = new Class({
  
  /**
   * Initialize with file _path_.
   *
   * @param  {string} path
   * @api public
   */
  
  constructor: function(path) {
    this.path = path
    if (path.indexOf('..') != -1)
      Error.raise('InvalidPathError', "`" + path + "' is not a valid path")
  },
  
  /**
   * Transfer static file to the given _request_.
   *
   *  - Ensures the file exists
   *  - Ensures the file is a regular file (not FIFO, Socket, etc)
   *  - Automatically assigns content type
   *  - Halts with 404 when failing
   *
   * @param  {Request} request
   * @settings 'cache static files'
   * @api public
   */
  
  sendTo: function(request) {
    var file = this.path
    function sendFromDisc() {
      path.exists(file, function(exists){
        if (!exists) return request.halt()
        fs.stat(file, function(err, stats){
          if (err) throw err
          if (!stats.isFile()) return request.halt()
          fs.readFile(file, 'binary', function(err, content){
            if (err) throw err
            request.contentType(file)
            if (set('cache static files'))
              request.cache.set('static:' + file, { type: file, content: content })
            request.halt(200, content, 'binary')
          })
        })
      })
    }
    if (set('cache static files'))
      request.cache.get('static:' + file, function(cache){
        if (cache) 
          request.contentType(cache.type),
          request.halt(200, cache.content, 'binary')
        else
          sendFromDisc()
      })
    else
      sendFromDisc()
  }
})

// --- Static

exports.Static = Plugin.extend({
  extend: {
    
    /**
     * Initialize routes and request extensions.
     *
     * Options:
     *
     *  - path   path from which to serve static files. Defaults to <root>/public
     * 
     * @param  {hash} options
     * @api private
     */
    
    init: function(options) {
      options = options || {}
      options.path = options.path || set('root') + '/public'
      
      // Routes
      
      get('/public/*', function(file){
        //this.sendfile(options.path + '/' + file)
        this.streamfile(options.path + '/' + file)
      })
      
      // Request
      
      Request.include({
        
        /**
         * Transfer static file at the given _path_.
         *
         * @param  {string} path
         * @return {Request}
         * @api public
         */

        sendfile: function(path) {
          (new exports.File(path)).sendTo(this)
          return this
        },
        
        /**
         * ...
         */
         
        streamfile: function(path) {
          // This looks good in general: http://gist.github.com/335623
          // I'd like streamfile to accept a stream or a string path
          // so I can create a stream, add my own listeners to
          // it and pass it into this method.
          // Actually, if caching is enabled, streaming isn't very
          // important since we can just halt() from memory
          var self = this
            , first = true
            , stream = typeof path == 'string'
                ? fs.createReadStream(path)
                : path
          stream
            .addListener('error', function(err) {
              if (first) {
                return 2 == err.errno // no such file or directory
                  ? self.halt()
                  : self.error(err)   
              }
              // weird fd errors here, how to handle best?
              require('sys').p(err)       
              self.response.close()
            })
            .addListener('data', function(data) {
              if (first) {
                // need to send headers before contents
                stream.pause()
                self.response.noContentLength = true
                self.status(200)
                return self.trigger('response', function(err) {
                  if (err) {
                    stream.destroy()
                    return self.error(err)
                  }
                  first = false
                  self.contentType(stream.path)
                  self.response.writeHeader(self.response.status, self.response.headers)
                  self.response.write(data, 'binary')
                  stream.resume()  
                }, true)
              }
              self.response.write(data, 'binary')            
            })
            .addListener('end', function() {
              self.response.close()
            })
          return self
        }
        
      })
    }
  }
})