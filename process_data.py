import json
import os
import re

def sanitize_id(id_str):
    # Garante que o ID seja seguro para o sistema de arquivos
    return re.sub(r'[^a-zA-Z0-9_\-]', '', id_str)

def process_data():
    # Caminhos dos arquivos de entrada
    metaforas_path = 'src/metaforas_data.json'
    frases_path = 'src/metamensagem_data.json'
    
    # Caminhos de saída
    output_dir = 'public/metaforas'
    index_file = 'public/metaforas-index.json'
    
    # Cria diretórios se não existirem
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    metaforas_index = []
    
    # Processa Metáforas
    try:
        with open(metaforas_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
            for item in data:
                # Sanitiza ID
                safe_id = sanitize_id(item.get('id', 'unknown'))
                
                # Cria item para o index (apenas metadados)
                index_item = {
                    "id": safe_id,
                    "titulo": item.get('titulo', ''),
                    "autor": item.get('autor', ''),
                    "tags": item.get('tags', []),
                    "resumo": item.get('resumo', item.get('texto', '')[:100] + '...')
                }
                metaforas_index.append(index_item)
                
                # Cria arquivo individual completo
                with open(f'{output_dir}/{safe_id}.json', 'w', encoding='utf-8') as individual_file:
                    json.dump(item, individual_file, ensure_ascii=False, indent=2)
                    
        print(f"Sucesso: {len(metaforas_index)} metáforas processadas.")
    except Exception as e:
        print(f"Erro ao processar metáforas: {e}")

    # Salva o index final
    try:
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(metaforas_index, f, ensure_ascii=False, indent=2)
        print(f"Sucesso: Index gerado em {index_file}")
    except Exception as e:
        print(f"Erro ao salvar index: {e}")

if __name__ == "__main__":
    process_data()
