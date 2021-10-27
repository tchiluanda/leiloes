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

        format : (number) => number.toFixed(2).replace('.', ','),

        populate_data_field : (ref) => {

            // ref vai ser tanto a referencia para selecionar o campo, quando a referencia à chave do objeto s.data.summary

            let el = document.querySelector('[data-vartext-' + ref + ']');
            
            let value = s.data.summary[ref];

            // special treatments
            if (ref == 'va_financeiro_total') { value = `R$ ${s.utils.format(value/1e12)} trilhões`}

            el.innerText = value;

        }

    },

    control : {

        init : () => s.data.read(),

        after_init : (data) => {

            s.data.raw = data;

            s.data.summary.qde_leiloes = s.utils.count(data);
            s.data.summary.va_financeiro_total = s.utils.sum_column(data, 'VA_FINANCEIRO_ACEITO');

            // popula textos
            const summary_keys = Object.keys(s.data.summary);
            summary_keys.forEach(key => s.utils.populate_data_field(key));


        }

    }

}

s.control.init();