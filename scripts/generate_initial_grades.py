import json
import re
from generate_all_students_ts import enrollment_map

with open('src/data/pdfDataset.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Extract json inside fullPdfDataset
json_str = code.replace('export const fullPdfDataset = ', '').rstrip(';\n')
data = json.loads(json_str)

name_to_id = {}
for name, enrollment in enrollment_map.items():
    clean = name.strip().lower()
    name_to_id[clean] = f"std_{enrollment}"

subject_map = {
    "ANATOMIA E FISIOLOGIA HUMANA": "enf_m1_anatomia",
    "FUNDAMENTOS DE ENFERMAGEM": "enf_m1_intro"
}

grades = []
gid = 1

for cls in data.get("classes", []):
    class_id = "class_enf_m1_matutino"
    for sub in cls.get("subjects", []):
        sname = sub.get("subjectName", "").strip().upper()
        sub_id = subject_map.get(sname, "enf_m1_anatomia")
        for rec in sub.get("records", []):
            st_name = rec.get("studentName", "").strip().lower()
            st_id = name_to_id.get(st_name)
            if not st_id:
                for kname, id_val in name_to_id.items():
                    if kname in st_name or st_name in kname:
                        st_id = id_val
                        break
            if st_id:
                s1 = rec.get("s1", 80)
                s2 = rec.get("s2", 80)
                pf = rec.get("pf", 80)
                concept = rec.get("concept", "B")
                result = rec.get("result", "APTO")
                grades.append({
                    "id": f"g_init_{gid}",
                    "studentId": st_id,
                    "subjectId": sub_id,
                    "classId": class_id,
                    "s1": s1,
                    "s2": s2,
                    "pf": pf,
                    "concept": concept,
                    "result": result
                })
                gid += 1

print(f"Generated {len(grades)} initial grades.")

output_ts = "import { GradeRecord } from '../types';\n\nexport const initialGrades: GradeRecord[] = " + json.dumps(grades, indent=2) + ";\n"

with open('src/data/initialGrades.ts', 'w', encoding='utf-8') as f:
    f.write(output_ts)
