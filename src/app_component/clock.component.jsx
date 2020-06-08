import React, { Component } from 'react';
import './clock.style.css'


class Timer extends Component{

    state = { 
        date: new Date()
    };


    callMe(){
        setInterval(() => {
            this.setState({date: new Date()})
        }, 1000);
    }

    render(){
        return(
            <div className="container p-3 my-3 ">
            <aside className="container-sm">
                <h1>Current Time</h1>
                <h2>{this.state.date.toLocaleTimeString()}</h2>
                {this.callMe()}
            </aside>
            </div>
        );
    }
} 


export default Timer;