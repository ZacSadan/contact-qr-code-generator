// Builds the contact form from fields-schema.js and binds it to the model.
// User input is only ever set via .value / textContent (never innerHTML).
import { SECTIONS, SINGLE_FIELDS, MULTI_FIELDS, ADDRESS_TYPES, ADDRESS_PARTS } from './fields-schema.js';
import { emptyAddress } from './state.js';
import { h } from './ui.js';
import { tr, getLang } from './i18n.js';

const typeLabel = (listKey, value, english) => tr(`type.${listKey}.${value}`, tr(`type.${value}`, english));

export function createForm({ container, addSelect, getModel, onChange }) {
  const typeSelect = (listKey, types, value, onPick, label) =>
    h('select', { class: 'type-select', 'aria-label': label, onchange: e => onPick(e.target.value) },
      types.map(([v, l]) => h('option', { value: v, selected: v === value }, typeLabel(listKey, v, l))));

  const removeBtn = (label, onClick) =>
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, onclick: onClick }, '✕');

  function singleSection(section, model) {
    const fields = SINGLE_FIELDS.filter(f => f.section === section.id && (!f.optional || model.visibleOptional.includes(f.key)));
    return h('div', { class: 'grid' }, fields.map(f => {
      const id = `f-${f.key}`;
      const labelText = tr(`field.${f.key}`, f.label);
      const common = {
        id, 'data-key': f.key, dir: 'auto', placeholder: tr(`ph.${f.key}`, f.placeholder || ''), value: model.fields[f.key] || '',
        oninput: e => { getModel().fields[f.key] = e.target.value; onChange(); },
      };
      // Suggestions (datalist): common values to pick from, free text still allowed.
      // Hebrew UI shows the Hebrew list first, then the English one.
      let datalist = null;
      if (f.suggestions) {
        const lists = getLang() === 'en' ? [f.suggestions.en] : [f.suggestions[getLang()], f.suggestions.en];
        const values = [...new Set(lists.flat().filter(Boolean))];
        datalist = h('datalist', { id: `dl-${f.key}` }, values.map(v => h('option', { value: v })));
      }
      const input = f.type === 'textarea'
        ? h('textarea', common)
        : h('input', { ...common, type: f.type || 'text', autocomplete: datalist ? 'off' : autocompleteFor(f.key), list: datalist ? `dl-${f.key}` : null });
      const label = h('label', { for: id }, labelText);
      const head = f.optional
        ? h('div', { class: 'label-row' }, label, removeBtn(`${tr('form.remove')} ${labelText}`, () => {
          const m = getModel();
          m.fields[f.key] = '';
          m.visibleOptional = m.visibleOptional.filter(k => k !== f.key);
          rebuild(); onChange();
        }))
        : label;
      return h('div', { class: `field${f.type === 'textarea' ? ' span-all' : ''}` }, head, input, datalist);
    }));
  }

  function multiSection(def, model) {
    const list = model[def.key];
    const addText = tr(`add.${def.key}`, def.addLabel);
    const rows = list.map((row, i) => h('div', { class: 'multi-row' },
      typeSelect(def.key, def.types, row.type, v => { row.type = v; onChange(); }, tr('form.type')),
      h('input', {
        type: def.inputType, dir: 'auto', placeholder: tr(`ph.${def.key}`, def.placeholder), value: row.value,
        'data-multi': `${def.key}-${i}`, 'aria-label': tr(`section.${def.key}`, SECTIONS.find(s => s.id === def.key)?.title || def.key),
        oninput: e => { row.value = e.target.value; onChange(); },
      }),
      removeBtn(tr('form.remove'), () => { list.splice(i, 1); rebuild(); onChange(); }),
    ));
    const add = h('button', {
      type: 'button', class: 'add-btn',
      onclick: () => {
        list.push({ type: nextType(def, list), value: '' });
        rebuild(); onChange();
        container.querySelector(`[data-multi="${def.key}-${list.length - 1}"]`)?.focus();
      },
    }, `＋ ${addText}`);
    return [h('div', { class: 'multi-list' }, rows), add];
  }

  function addressSection(model) {
    const blocks = model.addresses.map((a, i) => h('div', { class: 'address-block' },
      h('div', { class: 'address-head' },
        typeSelect('addresses', ADDRESS_TYPES, a.type, v => { a.type = v; onChange(); }, tr('form.addressType')),
        removeBtn(tr('form.removeAddress'), () => { model.addresses.splice(i, 1); rebuild(); onChange(); })),
      h('div', { class: 'grid' }, ADDRESS_PARTS.map(p => {
        const id = `adr-${i}-${p.key}`;
        return h('div', { class: `field${p.wide ? ' span-all' : ''}` },
          h('label', { for: id }, tr(`adr.${p.key}`, p.label)),
          h('input', { id, dir: 'auto', placeholder: tr(`adrph.${p.key}`, p.placeholder), value: a[p.key], oninput: e => { a[p.key] = e.target.value; onChange(); } }));
      })),
    ));
    const add = h('button', {
      type: 'button', class: 'add-btn',
      onclick: () => {
        const used = model.addresses.map(x => x.type);
        model.addresses.push(emptyAddress(['WORK', 'HOME', 'OTHER'].find(t => !used.includes(t)) || 'OTHER'));
        rebuild(); onChange();
        document.getElementById(`adr-${model.addresses.length - 1}-street`)?.focus();
      },
    }, `＋ ${tr('add.addresses')}`);
    return [h('div', {}, blocks), add];
  }

  function buildAddSelect(model) {
    addSelect.replaceChildren(h('option', { value: '' }, tr('form.addField')));
    let any = false;
    for (const section of SECTIONS) {
      const hidden = SINGLE_FIELDS.filter(f => f.section === section.id && f.optional && !model.visibleOptional.includes(f.key));
      if (!hidden.length) continue;
      any = true;
      addSelect.append(h('optgroup', { label: tr(`section.${section.id}`, section.title) },
        hidden.map(f => h('option', { value: f.key }, tr(`field.${f.key}`, f.label)))));
    }
    addSelect.setAttribute('aria-label', tr('form.addField'));
    addSelect.hidden = !any;
  }

  addSelect.addEventListener('change', () => {
    const key = addSelect.value;
    if (!key) return;
    getModel().visibleOptional.push(key);
    rebuild();
    document.getElementById(`f-${key}`)?.focus();
  });

  function rebuild() {
    const model = getModel();
    container.replaceChildren(...SECTIONS.map(section => {
      const body = section.kind === 'single' ? singleSection(section, model)
        : section.kind === 'address' ? addressSection(model)
          : multiSection(MULTI_FIELDS.find(d => d.key === section.id), model);
      return h('section', { class: 'form-section' }, h('h2', { class: 'section-title' }, tr(`section.${section.id}`, section.title)), body);
    }));
    buildAddSelect(model);
  }

  return { rebuild };
}

function nextType(def, list) {
  const used = list.map(r => r.type);
  return (def.types.find(([v]) => !used.includes(v)) || def.types[def.types.length - 1])[0];
}

function autocompleteFor(key) {
  return {
    prefix: 'honorific-prefix', firstName: 'given-name', middleName: 'additional-name', lastName: 'family-name',
    suffix: 'honorific-suffix', nickname: 'nickname', company: 'organization', jobTitle: 'organization-title', birthday: 'bday',
  }[key] || 'off';
}
