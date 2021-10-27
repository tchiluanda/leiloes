const s = {

    data : {

        origem : './data.json',

        raw : null,

        summary : {

            // chaves aqui iguais às strings dos atributos `data-vartext-` do html.

            va_financeiro_total : null,
            qde_leiloes : null

        },

        points : null,

        read : function() {

            fetch(this.origem)
              .then(response => { 
                  
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log(response.status);
                return response.json()

              })
              .then(contents => {

                // faz um ajuste para criar um campo de data em formato de... data.
                contents.forEach(row => {
                    const date = d3.timeParse("%Y-%m-%d")(row.DT_LEILAO);
                    row.date = date;
                    row.date_month = new Date(date.getFullYear(), date.getMonth(), 1);
                })

                s.control.after_init(contents);

              })

        }

    },

    utils : {

        sum : (array) => array.reduce(
            (va_acumulado, va_atual) => va_acumulado + va_atual
        ),

        sum_column : (array, column) => s.utils.sum( array.map(d => d[column]) ),

        count : (array) => array.length,

        format_decimal : (number) => number.toFixed(2).replace('.', ','),

        format_thousands : (number) => number.toLocaleString(),

        populate_data_field : (ref) => {

            // ref vai ser tanto a referencia para selecionar o campo, quando a referencia à chave do objeto s.data.summary

            let el = document.querySelector('[data-vartext-' + ref + ']');
            
            let value = s.data.summary[ref];

            // special treatments
            if (ref == 'va_financeiro_total') { value = `R$ ${s.utils.format_decimal(value/1e12)} trilhões`}

            if (ref == 'qde_leiloes') { value = s.utils.format_thousands(value)}

            el.innerText = value;

        }

    },

    vis : {

        canvas : document.querySelector('canvas'),

        sizing : {

            canvas_width : 2048,
            canvas_height : null,

            w : null,
            h : null,
            ratio : null,

            margin : 100,

            get_size : () => {

                s.vis.sizing.w = +window.getComputedStyle(s.vis.canvas).width.slice(0,-2);
                s.vis.sizing.h = +window.getComputedStyle(s.vis.canvas).height.slice(0,-2);
                s.vis.sizing.ratio = s.vis.sizing.w / s.vis.sizing.h

            },

            set_resolution : () => {

                s.vis.canvas.width = s.vis.sizing.canvas_width;
                
                const height = Math.round(s.vis.sizing.canvas_width / s.vis.sizing.ratio);
                s.vis.canvas.height = height;
                s.vis.sizing.canvas_height = height;

            }

        },

        states : {

            /* colunas
            DT_LEILAO: "2008-01-09"
            SG_TITULO: "LFT"
            VA_FINANCEIRO_ACEITO: 1154169252.84
            VA_TAXA_ACEITA: -0.0002
            ano_leilao: 2008
            duracao: 6.1562
            faixa_duracao: "5 a 10 anos"
            */

            'scatter taxa x data leilao' : {

                x : {
                    
                    variable : 'date',
                    type : 'date',

                },

                y : {
                    
                    variable : 'VA_TAXA_ACEITA',
                    type : 'numeric'

                }

            },

            'scatter taxa x mes leilao' : {

                x : {
                    
                    variable : 'date_month',
                    type : 'date',

                },

                y : {
                    
                    variable : 'VA_TAXA_ACEITA',
                    type : 'numeric'

                }


            }


        },

        scales : {

            x : null,
            y : null

        },

        prepare : () => {

            const states = Object.keys(s.vis.states);

            console.log(states);

        },

        render : {

            axis : () => {

                const ctx = s.vis.canvas.getContext('2d');

                const height = s.vis.sizing.canvas_height;
                const width = s.vis.sizing.canvas_width;
                const margin = s.vis.sizing.margin;

                const x0 = margin;
                const x1 = width-margin;
                const y0 = height-margin
                const y1 = margin;
    
                ctx.strokeStyle = 'gray';
                ctx.lineWidth = 2;
    
                console.log(x0, y0, x1, y1);
    
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x0, y1);
                ctx.closePath();
                ctx.stroke();
    
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y0);
                ctx.closePath();
                ctx.stroke();

            },

            state : (state) => {

                const data = s.data.raw.filter(d => d.SG_TITULO == 'LTN');
    
                const ctx = s.vis.canvas.getContext('2d');
    
                const variavel_x = s.vis.states[state].x.variable; 
                const variavel_y = s.vis.states[state].y.variable;
    
                console.log(variavel_x, variavel_y)
    
                // scales
    
                const height = s.vis.sizing.canvas_height;
                const width = s.vis.sizing.canvas_width;
                const margin = s.vis.sizing.margin;
    
                const dims = Object.keys(s.vis.scales); // x and y
    
                dims.forEach(dim => {
    
                    const variable = s.vis.states[state][dim].variable;
    
                    if (s.vis.states[state][dim].type == 'date') {
    
                        s.vis.scales[dim] = d3.scaleTime();
        
                    } else {
    
                        s.vis.scales[dim] = d3.scaleLinear();
    
                    }
    
                    s.vis.scales[dim]
                        .domain(d3.extent(data, d => d[variable]));
                
                })
    
                s.vis.scales.x.range([margin, width - margin]);
                s.vis.scales.y.range([height - margin, margin]);
    
                // draw
    
                let i = 0;
    
                data.forEach(leilao => {
    
                    const x = s.vis.scales.x(leilao[variavel_x]);
                    const y = s.vis.scales.y(leilao[variavel_y]);
    
                    // if (i < 100) {
    
                    //     console.log(leilao,x,y);
                    //     i++;
    
                    // }
                    
    
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, 360, false);
                    ctx.fillStyle ='tomato';
                    ctx.fill();
                    
    
                })
    
            }

        }


    },

    control : {


        //control.init => calls s.data.read => calls s.control.after_init

        init : () => s.data.read(),

        after_init : (data) => {

            s.data.raw = data;

            s.data.summary.qde_leiloes = s.utils.count(data);
            s.data.summary.va_financeiro_total = s.utils.sum_column(data, 'VA_FINANCEIRO_ACEITO');

            // popula textos
            const summary_keys = Object.keys(s.data.summary);
            summary_keys.forEach(key => s.utils.populate_data_field(key));

            // get canvas size
            s.vis.sizing.get_size();
            s.vis.sizing.set_resolution();

            // draw
            //s.vis.render('scatter taxa x data leilão')


        }

    }

}

s.control.init();