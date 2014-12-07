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

    function Fast(src) {
        var program, device;

        _checkWebCl();

        this.args = [];
        this.ctx = env.webcl.createContext();

        program = this.ctx.createProgram(src);
        device = this.ctx.getInfo(WebCL.CONTEXT_DEVICES)[0];
        program.build([device], '');

        this.kernel = program.createKernel("ckVectorAdd");
        this.cmdQueue = this.ctx.createCommandQueue(device);
    }

    Fast.prototype = {
        // (String, Array) -> Number
        setArg: function(type, data) {
            var arg = new Uint32Array(data);
            this.args.push(arg);

            return this.args.length - 1;
        },

        // (Number) -> Array
        getArg: function(id) {
            return Array.prototype.slice.call(this.args[id]);
        },

        // (Number) -> Array
        compute: function(resultSize) {
            // input
            for (var i = 0; i < this.args.length - 1; i++) {
                var bufSize = this.args[i].length * 4,
                    argBuf = this.ctx.createBuffer(WebCL.MEM_READ_ONLY, bufSize);
                this.kernel.setArg(i, argBuf);
                this.cmdQueue.enqueueWriteBuffer(argBuf, false, 0, bufSize, this.args[i]);
            }

            // output (must be last arg)
            var i = this.args.length - 1,
                bufSize = this.args[i].length * 4,
                outBuf = this.ctx.createBuffer(WebCL.MEM_WRITE_ONLY, bufSize);
            this.kernel.setArg(i, outBuf);

            // Init ND-range. TODO: ???
            var localWS = [8];
            var globalWS = [Math.ceil (resultSize / localWS) * localWS];

            // Execute (enqueue) kernel
            this.cmdQueue.enqueueNDRangeKernel(this.kernel, globalWS.length, null, globalWS, localWS);

            // Read the result buffer from OpenCL device
            var outBuffer = new Uint32Array(resultSize);
            this.cmdQueue.enqueueReadBuffer(outBuf, false, 0, bufSize, outBuffer);        
            this.cmdQueue.finish();

            return Array.prototype.slice.call(outBuffer);
        }
    }

    env.Fast = Fast;
})(window);