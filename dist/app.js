console.log("src/js/man.js");

var Man = function(name){
    // initialize
    this.name = name;

    this.greet = function(){
        return "Hello "+this.name;
    };
};

console.log("src/js/main.js");
var man = new Man("Tom");
console.log(man.greet());