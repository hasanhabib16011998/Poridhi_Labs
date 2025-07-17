const express = require("express");

const app = express();

const port = 3001;

app.get('/students',(req,res)=>{
    res.send("Hello Hasan!!!!!!!!!")
});

//using query
// URL: http://localhost:3001/employee/?id=122&dept=sports
app.get('/employee',(req,res)=>{
    const id = req.query.id;
    const dept = req.query.dept;
    console.log(`Got query for ${id} id and ${dept} department`);

    //get details
    const result={
        id: 122,
        name:"Mr. Mofazzol Hossain",
        dept:"sports",
        salary: 50000
    }
    if(id){
        res.send(result);

    }
    else {
        res.send("Employee not found")
    }
    
})

//using parameters
//URL: http://localhost:3001/employee/122/sports
app.get("/employee/:id/:dept",(req,res)=>{
    const id = req.params.id;
    console.log(id);
    const dept = req.params.dept;
    console.log(dept);

    if(id){
        res.send({
            id: id,
            name:"Mr. Mofazzol Hossain",
            dept:dept,
            salary: 50000

        })
    }
})


app.listen(port,()=>{
    console.log("started...");
});