const s = {

    data : {

        origem : './data.json',

        raw : null,

        summary : {

            // chaves aqui iguais às strings dos atributos `data-vartext-` do html.

            va_financeiro_total : null,
            qde_leiloes : null

        },

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

            w : null,
            h : null,
            ratio : null,

            get_size : () => {

                s.vis.sizing.w = +window.getComputedStyle(s.vis.canvas).width.slice(0,-2);
                s.vis.sizing.h = +window.getComputedStyle(s.vis.canvas).height.slice(0,-2);
                s.vis.sizing.ratio = s.vis.sizing.w / s.vis.sizing.h

            },

            set_resolution : () => {

                s.vis.canvas.width = s.vis.sizing.canvas_width;
                s.vis.canvas.height = Math.round(s.vis.sizing.canvas_width / s.vis.sizing.ratio);

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


        }

    }

}

s.control.init();