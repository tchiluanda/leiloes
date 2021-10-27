const s = {

    data : {

        origem : './data.json',

        raw : null,

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
                s.data.raw = contents;
              })

        }

    },

    init : function() {

        s.data.read();

    }

}

s.init();