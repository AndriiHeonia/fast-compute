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

    // (String) -> Array
    function _argInfo(src) {
        var cType2jsType = {
                // cType:   [jsType, isPointer]
                'ushort':   ['Uint16Array', false],
                'short':    ['Int16Array', false],
                'int':      ['Int32Array', false],
                'uint':     ['Uint32Array', false],
                'float':    ['Float32Array', false],
                'double':   ['Float64Array', false],
                'ushort*':  ['Uint16Array', true],
                'short*':   ['Int16Array', true],
                'int*':     ['Int32Array', true],
                'uint*':    ['Uint32Array', true],
                'float*':   ['Float32Array', true],
                'double*':  ['Float64Array', true]
            },
            argTypes = /kernel.*\((.*)\)/.exec(src)[1].split(',');

        argTypes = argTypes.map(function(arg) {
            // TODO: support u?char\*?
            var rexp = /(u?short\*?|u?int\*?|u?long\*?|float\*?|double\*?)/;
            return rexp.exec(arg)[1];
        });

        argTypes = argTypes.map(function(cType) {
            return cType2jsType[cType];
        });

        return argTypes;
    }

    function Fast(src) {
        var program, device;

        _checkWebCl();

        this.argInfo = _argInfo(src);
        this.ctx = env.webcl.createContext();

        this.program = this.ctx.createProgram(src);
        this.device = this.ctx.getInfo(WebCL.CONTEXT_DEVICES)[0];
        this.program.build([this.device], '');

        this.kernel = this.program.createKernel("callback");
        this.cmdQueue = this.ctx.createCommandQueue(this.device);
    }

    Fast.prototype = {
        compute: function() {
            var isPointer, memMode, buf, typedArray, globalWS;

            // set arguments to the kernels. Last argument - output
            for (var i = 0; i < arguments.length; i++) {
                isPointer = this.argInfo[i][1];
                typedArray = arguments[i];

                if (isPointer) {
                    memMode = i < arguments.length - 1 ? WebCL.MEM_READ_ONLY : WebCL.MEM_WRITE_ONLY;
                    buf = this.ctx.createBuffer(memMode, typedArray.byteLength);
                    this.kernel.setArg(i, buf);
                    if (memMode === WebCL.MEM_READ_ONLY) {
                        this.cmdQueue.enqueueWriteBuffer(buf, false, 0, typedArray.byteLength, typedArray);                        
                    }
                } else {
                    this.kernel.setArg(i, typedArray);
                }
            }

            // init ND-range & exec
            globalWS = this.kernel.getWorkGroupInfo(this.device, WebCL.KERNEL_WORK_GROUP_SIZE);
            this.cmdQueue.enqueueNDRangeKernel(this.kernel, 1, null, [globalWS], null);

            // read result from OpenCL device to output typed array
            this.cmdQueue.enqueueReadBuffer(buf, false, 0, typedArray.byteLength, typedArray);        
            this.cmdQueue.finish();

            return typedArray;
        }
    }

    env.Fast = Fast;
})(window);