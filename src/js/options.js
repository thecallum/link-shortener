import pageHeader from './components/header.js';
import echarts from 'echarts';

const generateFormOptions = (log) => {
    
    const yesterday = Math.floor((Date.now() / 1000) - 86400);
    const currentHour = new Date().getHours();
    
    // The graph shows 24 hour history
    const filteredDates = log.map(item => item.timestamp).filter(time => time >= yesterday);

    // Converts each timestamp to 24 hour format
    const formattedDates = filteredDates.map(date => new Date(date * 1000).getHours())

    // Add up each item, grouped by each hour
    // [...net Set()] return unique values
    const groupedDates = [... new Set(formattedDates)].map(time => ({
        time,
        count: formattedDates.filter(date => date === time).length
    }))

    const dataSet = Array.apply(null, {length: 24}).map((item, index) => {
        const hour =  currentHour - index;
        const time = hour < 0 ? hour + 24 : hour;

        // Check if logs contain data during this hour
        const foundIndex = groupedDates.findIndex(item => item.time == time);
        const count = foundIndex == -1 ? 0 : groupedDates[foundIndex].count;
        
        const formattedTime = `${((time/100).toFixed(2))*100}:00`;
        return [formattedTime,count]
    }).reverse()

    // console.table(dataSet);

    // specify chart configuration item and data
    return {
        grid: {},
        tooltip: {
            trigger: 'axis'
        },
        color: ['#087191'],
        xAxis: {
            type: 'category',
            data: dataSet.map(item => item[0]),
            name: 'Time',
            nameLocation: 'center',
            nameGap: 30,
            axisLabel: {
                showMaxLabel: true,
                showMinLabel: true
            }
        },
        yAxis: {
            type: 'value',
            name: 'Requests',
            nameLocation: 'center',
            nameGap: 30,
        },
        series: [{
            data: dataSet.map(item => item[1]),
            type: 'line',
            smooth: true,
            animationEasing: 'quinticInOut',
        }]
    };
}


new Vue({
    el: '#app',
    components: {pageHeader},
    data: function() {
        return {
            link: null,
            label: null,
            log: [],


            url: null,
        }
    },

    mounted() {
        const href = window.location.href;
        const linkURL = href.split('/').slice(-1)[0];

        fetch(`/options/data/${linkURL}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cache': 'no-cache'
            },
            credentials: 'include',
        }).then(response => {
            console.log('response', response)

            response.json().then(val => {

                // console.log('val', val)

                this.label = val.data.label;
                this.link = val.data.link;
                this.url = val.data.url;

                // log is for the graph

                this.log = val.log;

                // console.log(*)
                const options = generateFormOptions(this.log);

                myChart.setOption(options);

            })
        })

    }
    
})

const myChart = echarts.init(document.querySelector('#chart'));



