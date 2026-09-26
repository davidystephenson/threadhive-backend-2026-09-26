function inner () {
  if (1 > 2) {
    console.log('success')
  } else {
    throw new Error('failure')
  }
}

function outer () {
  console.log('outer before')
  inner()
  console.log('outer after')
}

console.log('before')
outer()
console.log('after')