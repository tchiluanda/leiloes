const s = {

    data : {

        origem : './data.json',

        raw : null,

        filtered : null,

        summary : {

            // chaves aqui iguais às strings dos atributos `data-vartext-` do html.

            va_financeiro_total : null,
            qde_leiloes : null,
            qde_anos : null

        },

        points : [],

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
                    row.date_year = new Date(date.getFullYear(), 0, 1);
                    row.year = date.getFullYear();
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

        unique : (array) => array.filter((v, i, a) => a.indexOf(v) === i),

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

        },

        retrieve_destination_data : {
            
            general : (i, target, dim, state) => target[dim][state],

            x : (i, target, state) => s.utils.retrieve_destination_data.general(i, target, 'next_x', state),

            y : (i, target, state) => s.utils.retrieve_destination_data.general(i, target, 'next_y', state),

            h : (i, target, state) => s.utils.retrieve_destination_data.general(i, target, 'next_h', state),

            w : (i, target, state) => s.utils.retrieve_destination_data.general(i, target, 'next_w', state),

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

            barwidth : 50,

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
            'inicial' : {

                type : 'bubbles',

                x : {
                    
                    variable : 'date',
                    type : 'date',

                },

                y : {
                    
                    variable : 'VA_TAXA_ACEITA',
                    type : 'numeric'

                }

            },

            'scatter taxa x data leilao' : {

                type : 'bubbles',

                x : {
                    
                    variable : 'date',
                    type : 'date',

                },

                y : {
                    
                    variable : 'VA_TAXA_ACEITA',
                    type : 'numeric'

                }

            },

            'scatter taxa x ano leilao' : {

                type : 'bubbles',

                x : {

                    variable : 'date_year',
                    type : 'date',
                    domain_variable : 'date'

                },

                y : {
                    
                    variable : 'VA_TAXA_ACEITA',
                    type : 'numeric'

                }

            },

            'scatter taxa x duracao' : {

                type : 'bubbles',

                x : {

                    variable : 'duracao',
                    type : 'numeric',

                },

                y : {
                    
                    variable : 'VA_TAXA_ACEITA',
                    type : 'numeric'

                }
                
            },

            'bar valor x ano leilao' : {

                type : 'rects',

                x : {

                    variable : 'date_year',
                    type : 'date',
                    domain_variable : 'date'

                },

                y : {
                    
                    variable : 'acum',
                    type : 'numeric',
                    zero_based : true

                }
                
            }


        },

        scales : {

            // esses x e y vao depender dos estados, vao ser setados no s.vis.prepare
            x : null,
            y : null,

            color : null,
            r : null,
            h : null, // altura do rect quando for um barchart

            set_color_and_radius : () => {

                // color

                const faixas = ['até 1 ano', '1 a 2 anos', '2 a 5 anos','5 a 10 anos', 'Acima de 10 anos'];

                const colors = [
                    "#7D1D67", "#C22B79", "#F65A6D", "#FFA076", "#FFD99F"
                ];

                s.vis.scales.color = d3.scaleOrdinal().domain(faixas).range(colors);

                // radius

                s.vis.scales.r = d3.scaleSqrt()
                  .range([2, 30])  // 45
                  .domain([0, d3.max(s.data.raw, d => d.VA_FINANCEIRO_ACEITO)]);

                // height

                //// criar objetos específicos para evitar essa repetição
                const height = s.vis.sizing.canvas_height;
                const width = s.vis.sizing.canvas_width;
                const margin = s.vis.sizing.margin;

                const data = s.data.raw.filter(d => d.SG_TITULO == 'LTN'); // fazer o tipo de título ser um parâmetro da função prepare()
                s.data.filtered = data;

                s.vis.scales.h = d3.scaleLinear()
                  .range([0, height-margin])
                  .domain([0, d3.max(data, d => d.acum)]);

            }

        },


        prepare : () => {

            // os dados
            const data = s.data.filtered;

            // inicializa points
            s.data.points = data.map((d,i) => (
                { 
                    id : i,
                    x : null,
                    y : null,
                    color : s.vis.scales.color(d.faixa_duracao),
                    r : s.vis.scales.r(d.VA_FINANCEIRO_ACEITO),
                    h : 2 * s.vis.scales.r(d.VA_FINANCEIRO_ACEITO),
                    w : 2 * s.vis.scales.r(d.VA_FINANCEIRO_ACEITO),
                    next_x : {},
                    next_y : {},
                    next_h : {},
                    next_w : {}
                })
            );

            const points = s.data.points;

            // dimensoes "fisicas"
            const height = s.vis.sizing.canvas_height;
            const width = s.vis.sizing.canvas_width;
            const margin = s.vis.sizing.margin;

            // estados
            const states = Object.keys(s.vis.states);

            console.log(states);

            // itera sobre os estados
            states.forEach(state => {

                // pega as variaveis do estado que vão ser usadas nos canais visuais

                // testa se foi explicitada uma domain_variable para definir a escala
                let variavel_x = s.vis.states[state].x.domain_variable ? 
                  s.vis.states[state].x.domain_variable : 
                  s.vis.states[state].x.variable;

                let variavel_y = s.vis.states[state].y.domain_variable ? 
                  s.vis.states[state].y.domain_variable : 
                  s.vis.states[state].y.variable;

                console.log(state, variavel_x, variavel_y);

                const dims = ['x', 'y'];

                // itera sobre os canais / dimensões
                dims.forEach(dim => {
    
                    const variable = s.vis.states[state][dim].variable;
    
                    if (s.vis.states[state][dim].type == 'date') {

                        s.vis.scales[dim] = d3.scaleTime();

                    } else {
    
                        s.vis.scales[dim] = d3.scaleLinear();
    
                    }

                    if (s.vis.states[state][dim].zero_based) {

                        s.vis.scales[dim]
                          .domain([0, d3.max(data, d => d[variable])]);

                    }
    
                    s.vis.scales[dim]
                      .domain(d3.extent(data, d => d[variable]));
                
                })

                s.vis.scales.x.range([margin, width - margin]);
                s.vis.scales.y.range([height - margin, margin]);

                // reaponta variavel_x e variavel_y para a variavel que de fato tem que ser mapeada
                variavel_x = s.vis.states[state].x.variable
                variavel_y = s.vis.states[state].y.variable

                // vai construindo o array points
                data.forEach( (d,i) => {

                    points[i].next_x[state] = s.vis.scales.x(d[variavel_x]);
                    points[i].next_y[state] = state == 'inicial' ? -100 : s.vis.scales.y(d[variavel_y]);
                    // se o estado for o inicial, seta o y para fora da área visível do canvas, para fazer uma animação inicial

                    if (s.vis.states[state].type == "rects") {
                        points[i].next_h[state] = s.vis.scales.h(d.VA_FINANCEIRO_ACEITO);
                        points[i].next_w[state] = s.vis.sizing.barwidth;
                    } else {
                        points[i].next_h[state] = points[i].h;
                        points[i].next_w[state] = points[i].w;
                    }

                })

            })

        },

        render : {

            axis : () => {

                const ctx = s.vis.canvas.getContext('2d');
                ctx.globalAlpha = 1;

                const height = s.vis.sizing.canvas_height;
                const width = s.vis.sizing.canvas_width;
                const margin = s.vis.sizing.margin;

                const x0 = margin;
                const x1 = width-margin;
                const y0 = height-margin
                const y1 = margin;
    
                ctx.strokeStyle = 'gray';
                ctx.lineWidth = 2;
    
                //console.log(x0, y0, x1, y1);
    
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

            points : (state, clear = true) => {

                //, s.vis.states[state].type);

                const height = s.vis.sizing.canvas_height;
                const width = s.vis.sizing.canvas_width;
    
                const ctx = s.vis.canvas.getContext('2d');

                if (clear) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                }

                s.vis.render.axis();

                s.data.points.forEach(point => {

                    if (state) {

                        point.x = point.next_x[state];
                        point.y = point.next_y[state];

                    } 

                    const [x, y] = [

                        point.x,
                        point.y

                    ];

                    if (s.vis.states[s.control.current_state].type == "rects") {

                        ctx.fillRect(x-50/2, y, 50, point.h);

                    } else {

                        ctx.globalAlpha = .5;
                        ctx.beginPath();
                        ctx.arc(x, y, point.r, 0, 360, false);

                    }

                    ctx.fillStyle = point.color;
                    ctx.fill();

                })
    
            }

        },

        animate : (state) => {

            // os states são
            //scatter taxa x ano leilao
            //scatter taxa x data leilao

            gsap.to(s.data.points, {
                duration: 2,
                //delay: 0,
                //delay: (i, target) => .1 * (i % 5),
                delay: (i, target) => Math.random() * 0.6,
                // stagger: { // wrap advanced options in an object
                //     each: 0.0005,
                //     from: "random",
                //     ease: "power2.inOut",
                //     repeat: 0 // Repeats immediately, not waiting for the other staggered animations to finish
                // },
                ease: "power2.inOut",
                x : (i, target) => s.utils.retrieve_destination_data.x(i, target, state),
                y : (i, target) => s.utils.retrieve_destination_data.y(i, target, state),
                onUpdate : s.vis.render.points
                } 
            )
            
        }

    },

    interaction : {

        el : document.querySelector('select#estado'),

        seletor_grafico : {

            popula : () => {

                const sel = s.interaction.el;

                const estados = Object.keys(s.vis.states);

                estados.forEach(estado => {

                    const new_option = document.createElement("option");
                        
                    new_option.label = estado.slice(8,);
                    new_option.value = estado;

                    sel.appendChild(new_option);

                })

            },

            onUpdate : (e) => {

                const novo_estado = e.target.value;
                const estado_atual = s.control.current_state;

                console.log(estado_atual, ' agora vai para o ', novo_estado);

                if (!estado_atual) {

                    s.vis.render.points(novo_estado);

                } else {

                    s.vis.animate(novo_estado);

                }

                s.control.current_state = novo_estado;

    
            },
    
            monitora : () => {
    
                const sel = s.interaction.el;
    
                sel.addEventListener('change', s.interaction.seletor_grafico.onUpdate);
    
            }

        },



    },

    control : {

        current_state : 'inicial',

        //control.init => calls s.data.read => calls s.control.after_init

        init : () => s.data.read(),

        after_init : (data) => {

            s.data.raw = data;

            s.data.summary.qde_leiloes = s.utils.count(data);
            s.data.summary.va_financeiro_total = s.utils.sum_column(data, 'VA_FINANCEIRO_ACEITO');
            s.data.summary.qde_anos = s.utils.unique(s.data.raw.map(d => d.year)).length;

            // popula textos
            const summary_keys = Object.keys(s.data.summary);
            summary_keys.forEach(key => s.utils.populate_data_field(key));

            // popula seletor
            s.interaction.seletor_grafico.popula();

            // monitora seletor
            s.interaction.seletor_grafico.monitora();

            // get canvas size
            s.vis.sizing.get_size();
            s.vis.sizing.set_resolution();

            // prepare
            s.vis.scales.set_color_and_radius();
            s.vis.prepare();

            // draw axis
            s.vis.render.axis();
            s.vis.render.points('inicial');


        }

    }

}

s.control.init();