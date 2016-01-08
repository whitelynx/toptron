export function asSize(val, decimals)
{
    var suffix = 'B';
    if(val > 1024 * 1024 * 1024 * 1024)
    {
        val /= (1024 * 1024 * 1024 * 1024);
        suffix = 'TB';
    }
    else if(val > 1024 * 1024 * 1024)
    {
        val /= (1024 * 1024 * 1024);
        suffix = 'GB';
    }
    else if(val > 1024 * 1024)
    {
        val /= (1024 * 1024);
        suffix = 'MB';
    }
    else if(val > 1024)
    {
        val /= 1024;
        suffix = 'kB';
    } // end if

    if(decimals !== undefined)
    {
        var exponent = Math.pow(10, decimals);
        val = Math.round(val * exponent) / exponent;
    } // end if

    return `${val} ${suffix}`;
} // end asSize
