export function lookupObject(root, ...keys)
{
    var cur = root;
    keys.forEach((key) => cur = cur[key] || {});
    return cur;
} // end lookupObject

export function lookupValue(root, ...keys)
{
    var cur = root;
    try
    {
        keys.forEach((key) => cur = cur[key]);
        return cur;
    }
    catch(exc)
    {
        return undefined;
    } // end try
} // end lookupValue
