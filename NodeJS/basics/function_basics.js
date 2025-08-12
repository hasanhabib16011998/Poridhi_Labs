//declaring function like variable

function printName(func){
    func();
}

let cb = function(){
    console.log("passed function")
}

printName(cb);

const printAge = ()=> {
    console.log('This is arrow function')
}

printAge();