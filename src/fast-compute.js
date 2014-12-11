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
    function _getArgTypes(src) {
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

        this.argTypes = _getArgTypes(src);
        this.ctx = env.webcl.createContext();

        program = this.ctx.createProgram(src);
        device = this.ctx.getInfo(WebCL.CONTEXT_DEVICES)[0];
        program.build([device], '');

        this.kernel = program.createKernel("callback");
        this.cmdQueue = this.ctx.createCommandQueue(device);
    }

    Fast.prototype = {
        compute: function() {
            var type, isPointer, data, typedArray, outTypedArray, outBuf;

            // set arguments to the kernels, last argument - output
            for (var i = 0; i < arguments.length; i++) {
                type = env[this.argTypes[i][0]];
                isPointer = this.argTypes[i][1];
                data = arguments[i];
                typedArray = new type(data);

                if (isPointer) {
                    var memMode = i < arguments.length - 1 ? WebCL.MEM_READ_ONLY : WebCL.MEM_WRITE_ONLY,
                        buf = this.ctx.createBuffer(memMode, typedArray.byteLength);
                    this.kernel.setArg(i, buf);
                    if (memMode === WebCL.MEM_READ_ONLY) {
                        this.cmdQueue.enqueueWriteBuffer(buf, false, 0, typedArray.byteLength, typedArray);                        
                    }
                } else {
                    this.kernel.setArg(i, typedArray);
                }
            }

            // execute
            outBuf = buf;
            outTypedArray = typedArray;

            var localWS = [8];
            var globalWS = [Math.ceil(outTypedArray.byteLength / localWS) * localWS];
            // null - number of dimensions,
            // globalWS - the number of work-items in each dimension of the NDRange
            // localWS - the number of work-items in each dimension of the workgroups
            this.cmdQueue.enqueueNDRangeKernel(this.kernel, globalWS.length, null, globalWS, localWS);

            // read the result from OpenCL device to outTypedArray
            this.cmdQueue.enqueueReadBuffer(outBuf, false, 0, outTypedArray.byteLength, outTypedArray);        
            this.cmdQueue.finish();

            return Array.prototype.slice.call(outTypedArray);
        }
    }

    env.Fast = Fast;
})(window);