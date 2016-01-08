export function asPercent(val, decimals)
{
    val = val * 100;
    if(decimals !== undefined)
    {
        var exponent = Math.pow(10, decimals);
        val = Math.round(val * exponent) / exponent;
    } // end if
    return val + '%';
} // end asPercent

export function percentWidth(val)
{
    return {
        width: this.asPercent(val)
    };
} // end percentWidth
