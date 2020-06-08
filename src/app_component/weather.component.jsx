import React from 'react';

import './weather.style.css';
 


const Weather = (props) => {
    return(
        <div className="container cards text-light">
            <div className="cards pt-4">
                <h1>{props.city}<sup>{props.country}</sup></h1>
                <h5 className="py-4">
                    <i className={`wi ${props.weatherIcon} display-1`}/>
                </h5>
                {props.temp_celsius ?
                (<h1 className="py-2">
                {props.temp_celsius}<sup>&deg;C</sup></h1>)
                :null}
                {/**max and min temp */}
                {minmaxTemp(props.temp_min,props.temp_max)}
                <h4 className="py-3 font-italic">{props.description}</h4>
            </div>
        </div>
    );
};

function minmaxTemp(min,max){
   
        if(min && max){
            return(
            <h3>
            <span className="px-4">{min}&deg;<sup>c</sup></span>
            <span className="px-4">{max}&deg;<sup>c</sup></span>
        </h3>
        
    );
}
}
export default Weather;