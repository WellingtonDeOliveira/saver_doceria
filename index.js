document.addEventListener('DOMContentLoaded', function () {
    const tipoOvoRadios = document.querySelectorAll('input[name="tipo_ovo"]');
    const ovoPrincipal = document.getElementById('ovoPrincipal');
    const ovoSecundario = document.getElementById('ovoSegundario');
  
    function aplicarLimiteComplementos(selector, limite) {
        const checkboxes = document.querySelectorAll(selector);

        checkboxes.forEach(cb => {
        const cloneCb = cb.cloneNode(true);
        cb.parentNode.replaceChild(cloneCb, cb);
        });

        const novosCheckboxes = document.querySelectorAll(selector);

        function atualizar() {
        const selecionados = Array.from(novosCheckboxes).filter(cb => cb.checked);
        novosCheckboxes.forEach(cb => {
            cb.disabled = !cb.checked && selecionados.length >= limite;
        });
        }

        novosCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const selecionados = Array.from(novosCheckboxes).filter(cb => cb.checked);
            if (selecionados.length > limite) {
            cb.checked = false;
            alert(`Você pode escolher no máximo ${limite} complemento${limite > 1 ? 's' : ''}.`);
            }
            atualizar();
        });
        });

        atualizar();
    }
  
    function inicializarSecundario() {
        const clone = ovoPrincipal.cloneNode(true);
        clone.id = "ovoClonado";

        // Atualiza os names dos inputs para evitar conflito
        clone.querySelectorAll('[name]').forEach(el => {
        el.name = el.name + "_2";
        });

        const tituloClone = clone.querySelector('#tituloComplementos');
        if (tituloClone) {
          tituloClone.textContent = '4. Escolha até 1 Complemento';
        }

        // Limpa e mostra o secundário
        ovoSecundario.innerHTML = '<hr><h2>Opções para o segundo ovo de 100g</h2>';
        ovoSecundario.appendChild(clone);
        ovoSecundario.style.display = 'block';

        // Limpa complementos do clone antes de aplicar limites
        clone.querySelectorAll('input[name^="complementos"]').forEach(cb => {
            cb.checked = false;
            cb.disabled = false;
        });

        aplicarLimiteComplementos('#ovoClonado input[name="complementos_2"]', 1);
    }

    function prepararOvoPrincipalParaDois() {
        const ovoPrincipal = document.getElementById("ovoPrincipal");
        const titulo = document.createElement("h2");

        titulo.id = "tituloPrimeiroOvo";
        titulo.textContent = "Opções para o primeiro ovo de 100g";
      
        const hr = document.createElement("hr");
        hr.id = "linhaDivisoriaOvoPrincipal";
      
        const pai = ovoPrincipal.parentNode;
        pai.insertBefore(hr, ovoPrincipal);
        pai.insertBefore(titulo, ovoPrincipal);
    }

    function removerTituloDoOvoPrincipal() {
        const titulo = document.getElementById("tituloPrimeiroOvo");
        const hr = document.getElementById("linhaDivisoriaOvoPrincipal");
      
        if (titulo) titulo.remove();
        if (hr) hr.remove();
    } 
  
    const tituloComplementos = document.getElementById('tituloComplementos');

    tipoOvoRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          const principais = ovoPrincipal.querySelectorAll('input[name="complementos"]');
          principais.forEach(cb => {
            cb.checked = false;
            cb.disabled = false;
          });
      
          if (radio.checked && radio.value === "2x100") {
            aplicarLimiteComplementos('#ovoPrincipal input[name="complementos"]', 1);
            inicializarSecundario();
            prepararOvoPrincipalParaDois();
            tituloComplementos.textContent = '4. Escolha até 1 Complemento';
          } else if (radio.checked && radio.value === "350g") {
            ovoSecundario.innerHTML = '';
            ovoSecundario.style.display = 'none';
            aplicarLimiteComplementos('#ovoPrincipal input[name="complementos"]', 2);
            removerTituloDoOvoPrincipal();
            tituloComplementos.textContent = '4. Escolha até 2 Complementos';
          }
        });
    });
  
    aplicarLimiteComplementos('#ovoPrincipal input[name="complementos"]', 2);
    });
  
    document.getElementById('pedidoForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const tipo = document.querySelector('input[name="tipo_ovo"]:checked').value;

    let mensagens = [];

    function getDados(prefix = "", container = document) {
        const casca = container.querySelector(`input[name="casca${prefix}"]:checked`)?.value;
        const recheio = container.querySelector(`input[name="recheio${prefix}"]:checked`)?.value;
        const granulado = container.querySelector(`input[name="granulado${prefix}"]:checked`)?.value;
        let complementos = [...container.querySelectorAll(`input[name="complementos${prefix}"]:checked`)].map(e => e.value);
      
        if (!casca || !recheio || !granulado) {
          alert('Preencha todos os campos de casca, recheio e granulado.');
          throw new Error("Campos obrigatórios");
        }
      
        if (complementos.length === 0) {
          alert('Escolha pelo menos um complemento.');
          throw new Error("Sem complementos");
        }
      
        if(tipo === "350g") {
            if (complementos.length === 1) {
                alert('Você selecionou apenas um complemento. Ele será considerado duas vezes.');
                complementos = [complementos[0], complementos[0]];
            }
        }
    
        return `*Casca:* ${casca}\n*Recheio:* ${recheio}\n*Granulado:* ${granulado}\n*Complementos:* ${complementos.join(", ")}`;
    }     

    try {
        if (tipo === "350g") {
            const principal = document.getElementById("ovoPrincipal");
            if (!principal) throw new Error("Formulário principal não encontrado.");
            mensagens.push("*Pedido de Ovo de 350g:*\n" + getDados("", principal));
        } else {
            const principal = document.getElementById("ovoPrincipal");
            const secundario = document.getElementById("ovoClonado");
            if (!principal || !secundario) {
            alert("Erro interno: não foi possível encontrar os formulários dos ovos.");
            throw new Error("Formulários ausentes");
            }
            mensagens.push(
                "*Pedido de 2 ovos de 100g:*\n" +
                "->*Primeiro ovo:*\n" + getDados("", principal) + "\n\n" +
                "->*Segundo ovo:*\n" + getDados("_2", secundario)
              );              
        }
        
        const mensagemFinal = `Olá! Gostaria de fazer um pedido de ovo de colher personalizado:\n\n${mensagens.join("\n\n")}`;
        const linkWhatsApp = `https://wa.me/558599436791?text=${encodeURIComponent(mensagemFinal)}`;
        window.open(linkWhatsApp, '_blank');
    } catch (err) {
        console.warn("Erro ao enviar:", err.message);
    }      
});
  