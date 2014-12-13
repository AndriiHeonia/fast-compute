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
    function _argsInfo(src) {
        var argTypes = /kernel.*\((.*)\)/.exec(src)[1].split(',');

        argTypes = argTypes.map(function(arg) {
            var rexp = /(u?char\*|u?short\*?|u?int\*?|u?long\*?|float\*?|double\*?)/,
                argType = rexp.exec(arg)[1];
            return {
                cType: argType,
                pointer: argType.indexOf('*') > -1
            }
        });

        return argTypes;
    }

    // (String) -> Array
    function _funcsInfo(src) {
        var rexp = /kernel\s+void\s*(.*)\(.*\)/g,
            match, obj, res = [];
            
        while (match = rexp.exec(src)) {
            obj = {
                str: match[0],
                name: match[1],
                argsInfo: _argsInfo(match[0])
            }
            res.push(obj);
        }

        return res;
    }

    function Fast(src) {
        _checkWebCl();

        // js methods according to WebCL kernels
        _funcsInfo(src).forEach(function(fInfo) {
            Fast.prototype[fInfo.name] = function() {
                var args = Array.prototype.slice.call(arguments);
                this.compute.apply(this, args.concat([fInfo]));
            }
        });

        this.ctx = env.webcl.createContext();
        this.program = this.ctx.createProgram(src);
        this.device = this.ctx.getInfo(WebCL.CONTEXT_DEVICES)[0];
        this.program.build([this.device], '');
    }

    Fast.prototype = {
        compute: function() {
            var argInfo, memMode, buf, typedArray, globalWS,
                funcInfo = arguments[arguments.length-1],
                kernel = this.program.createKernel(funcInfo.name),
                cmdQueue = this.ctx.createCommandQueue(this.device);

            // set arguments to the kernels.
            // arguments[arguments.length-1] - argInfo
            // arguments[arguments.length-2] - output
            for (var i = 0; i < arguments.length-1; i++) {
                argInfo = funcInfo.argsInfo[i];
                typedArray = arguments[i];

                if (argInfo.pointer) {
                    memMode = i < arguments.length-2 ? WebCL.MEM_READ_ONLY : WebCL.MEM_WRITE_ONLY;
                    buf = this.ctx.createBuffer(memMode, typedArray.byteLength);
                    kernel.setArg(i, buf);
                    if (memMode === WebCL.MEM_READ_ONLY) {
                        cmdQueue.enqueueWriteBuffer(buf, false, 0, typedArray.byteLength, typedArray);                        
                    }
                } else {
                    kernel.setArg(i, typedArray);
                }
            }

            // init ND-range & exec
            globalWS = kernel.getWorkGroupInfo(this.device, WebCL.KERNEL_WORK_GROUP_SIZE);
            cmdQueue.enqueueNDRangeKernel(kernel, 1, null, [globalWS], null);

            // read result from OpenCL device to output typed array
            cmdQueue.enqueueReadBuffer(buf, false, 0, typedArray.byteLength, typedArray);        
            cmdQueue.finish();

            return typedArray;
        }
    }

    env.Fast = Fast;
})(window);