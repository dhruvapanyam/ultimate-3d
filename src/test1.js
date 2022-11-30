var myobj = {1:1};
function returnobj(){return myobj}
function addobj(){myobj[1]+=1}

export {myobj, addobj,returnobj};