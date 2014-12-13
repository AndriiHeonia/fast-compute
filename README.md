Fast-compute - high-level JavaScript library for the parallel heterogeneous computing (GPGPU).

## Usage

### declare callbacks (kernels)

    <script id="callbacks" type="text/x-opencl">
        kernel void sum(global uint* arr1, global uint* arr2, uint len, global uint* out) {
            uint i = get_global_id(0);
            if (i >= len) { return; }
            out[i] = arr1[i] + arr2[i];
        }
        kernel void sub(global uint* arr1, global uint* arr2, uint len, global int* out) {
            uint i = get_global_id(0);
            if (i >= len) { return; }
            out[i] = arr1[i] - arr2[i];
        }
    </script>

### init `Fast` instance and call the appropriate methods

    var len = 5000000,
        arr1 = new Uint32Array(len),
        arr2 = new Uint32Array(len),
        sum = new Uint32Array(len),
        sub = new Int32Array(len);

    // fill input arrays
    for (var i = 0; i < len; i++) {
        arr1[i] = i;
        arr2[i] = i*i;
    }

    var fast = new Fast(document.getElementById('callbacks').text);

    fast.sum(arr1, arr2, new Uint32Array([len]), sum);
    console.log('sum:', sum);

    fast.sub(arr1, arr2, new Uint32Array([len]), sub);
    console.log('sub:', sub);

## To-do
1. Try to write more complex examples and ensure that it's possible:
    1.1. global/local kernels arguments usage
    1.2. when to use (or don't use) C pointers
    1.3. how to compute 2 dimensional matrix
    1.4. what about image type usage instead of buffers?
2. Implement WebGL fallback
3. Write build tasks and tests
4. Try to use it in hull.js

## Changelog
### 0.1.0 — 13.12.2014
First and very simple version