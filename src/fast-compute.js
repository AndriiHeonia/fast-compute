(function(env){

    function WebCLException(msg) {
        this.name = "WebCLException";
        this.msg = msg;
        this.toString = function() {
            return this.name + '. ' + this.msg
        }
    }

    function _checkWebCl() {
        if (env.webcl === undefined) {
            throw new WebCLException('Please check OpenCL driver on your computer and make sure that your environment supports WebCL.');
        }
    }

    function _isPointer(type) {
        return type.indexOf('*') !== -1;
    }

    function Fast(src) {
        var program, device;

        _checkWebCl();

        this.args = [];
        this.ctx = env.webcl.createContext();

        program = this.ctx.createProgram(src);
        device = this.ctx.getInfo(WebCL.CONTEXT_DEVICES)[0];
        program.build([device], '');

        this.kernel = program.createKernel("callback");
        this.cmdQueue = this.ctx.createCommandQueue(device);
    }

    Fast.prototype = {
        // (String, Array) -> Number
        setArg: function(type, data) {
            // TODO: parse callback code and automatically detect types
            var i = this.args.length,
                arg = new Uint32Array(data); // TODO: fix hardcoded type
            
            this.args.push(arg);

            if (_isPointer(type)) {
                var bufSize = this.args[i].length * 4,
                    argBuf = this.ctx.createBuffer(WebCL.MEM_READ_ONLY, bufSize);
                this.kernel.setArg(i, argBuf);
                this.cmdQueue.enqueueWriteBuffer(argBuf, false, 0, bufSize, this.args[i]);
            } else {
                this.kernel.setArg(i, this.args[i]);
            }

            return i;
        },

        // (Number) -> Array
        getArg: function(id) {
            return Array.prototype.slice.call(this.args[id]);
        },

        // (Number) -> Array
        compute: function() {
            // output (must be last arg in kernel callback)
            var i = this.args.length - 1,
                resSize = this.args[i].length,
                bufSize = resSize * 4,
                outBuf = this.ctx.createBuffer(WebCL.MEM_WRITE_ONLY, bufSize);
            this.kernel.setArg(i, outBuf);

            // Init ND-range. TODO: ???
            var localWS = [8];
            var globalWS = [Math.ceil (resSize / localWS) * localWS];

            // Execute (enqueue) kernel
            this.cmdQueue.enqueueNDRangeKernel(this.kernel, globalWS.length, null, globalWS, localWS);

            // Read the result buffer from OpenCL device
            var outBuffer = new Uint32Array(resSize);
            this.cmdQueue.enqueueReadBuffer(outBuf, false, 0, bufSize, outBuffer);        
            this.cmdQueue.finish();

            return Array.prototype.slice.call(outBuffer);
        }
    }

    env.Fast = Fast;
})(window);